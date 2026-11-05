import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { unzipSync } from "fflate";
import { ROOT, RSCRIPT } from "../server/runtime.mjs";
import { exampleProject } from "../shared/examples.mjs";

await fs.mkdir(path.join(ROOT, "verification"), { recursive: true });

test(
  "local API: import → map → render → save → restore → export → reproduce",
  { timeout: 90000 },
  async (t) => {
    const dir = await fs.mkdtemp(path.join(ROOT, "verification", "http-")),
      port = 47839,
      base = "http://127.0.0.1:" + port;
    const child = spawn(process.execPath, ["server/index.mjs"], {
      cwd: ROOT,
      windowsHide: true,
      env: { ...process.env, FIGURE_PORT: String(port), FIGURE_DATA_DIR: dir },
      stdio: ["ignore", "pipe", "pipe"],
    });
    t.after(() => child.kill());
    let output = "";
    child.stderr.on("data", (b) => (output += b));
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(output || "server timeout")),
        15000,
      );
      child.stdout.once("data", () => {
        clearTimeout(timer);
        resolve();
      });
      child.once("error", reject);
    });
    assert.equal((await fetch(base)).status, 200);
    const session = await (await fetch(base + "/api/session")).json(),
      headers = {
        Authorization: "Bearer " + session.token,
        "Content-Type": "application/json",
      };
    const request = async (route, data) => {
      const r = await fetch(base + route, {
        method: data ? "POST" : "GET",
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });
      const b = await r.json();
      if (!r.ok) throw new Error(r.status + " " + b.error);
      return b;
    };
    assert.equal((await fetch(base + "/api/catalog")).status, 401);
    assert.equal(
      (
        await fetch(base + "/api/session", {
          headers: { Origin: "https://example.com" },
        })
      ).status,
      403,
    );
    let p = exampleProject("bar");
    const imported = await request("/api/import", {
      name: "根长.csv",
      base64: Buffer.from(
        "处理,根长\n对照,43.7\n对照,51.2\n盐,31.6\n盐,34.8",
      ).toString("base64"),
    });
    p.data = imported.data;
    p.originalData = structuredClone(p.data);
    const inspect = await request("/api/inspect", p);
    p.mapping = inspect.mapping;
    assert.equal((await request("/api/inspect", p)).check.ok, true);
    assert.equal(
      (
        await fetch(base + "/api/prism", {
          method: "POST",
          headers,
          body: JSON.stringify({ project: p }),
        })
      ).status,
      404,
    );
    const rSource = await fetch(base + "/api/r-source", {
      method: "POST",
      headers,
      body: JSON.stringify({ project: p }),
    });
    assert.equal(rSource.status, 200);
    assert((await rSource.text()).includes("figure_library_mode <- TRUE"));
    const job = await request("/api/render", { project: p, format: "png" });
    let complete;
    for (let i = 0; i < 100; i++) {
      complete = await request("/api/jobs/" + job.id);
      if (["done", "error"].includes(complete.status)) break;
      await new Promise((r) => setTimeout(r, 150));
    }
    assert.equal(complete.status, "done", complete.error);
    const png = Buffer.from(
      await (await fetch(base + complete.url)).arrayBuffer(),
    );
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(
      png.readUInt32BE(16),
      Math.trunc((p.params.widthMm / 25.4) * 300),
    );
    p = await request("/api/projects", p);
    const version1 = structuredClone(p);
    p.params.linewidth = 1.2;
    // Concurrent save requests with the same parent revision cannot both win.
    const pair = await Promise.all(
      [1, 2].map(() =>
        fetch(base + "/api/projects", {
          method: "POST",
          headers,
          body: JSON.stringify(p),
        }),
      ),
    );
    assert.deepEqual(pair.map((r) => r.status).sort(), [200, 409]);
    p = await pair.find((r) => r.status === 200).json();
    const history = await request("/api/projects/" + p.id + "/history");
    assert.equal(history.length, 2);
    const old = await request("/api/projects/" + p.id + "/1");
    assert.equal(old.params.linewidth, 0.5);
    old.revision = p.revision;
    const restored = await request("/api/projects", old);
    assert.equal(restored.revision, 3);
    const style = await request("/api/styles", {
      project: {
        ...p,
        params: { ...p.params, pThreshold: 0.01, omitMissing: true },
      },
      name: "测试样式",
    });
    assert.equal(style.params.pThreshold, undefined);
    assert.equal(style.params.omitMissing, undefined);
    assert.equal(style.data, undefined);
    assert.equal(style.params.linewidth, 1.2);
    const response = await fetch(base + "/api/bundle", {
      method: "POST",
      headers,
      body: JSON.stringify(version1),
    });
    assert.equal(response.status, 200);
    const zip = unzipSync(new Uint8Array(await response.arrayBuffer()));
    assert(zip["source-original.csv"]);
    assert(zip["renderer.R"]);
    assert(zip["original-data.csv"]);
    assert(zip["provenance.json"]);
    const bundle = path.join(dir, "bundle");
    await fs.mkdir(bundle);
    for (const [name, bytes] of Object.entries(zip))
      await fs.writeFile(path.join(bundle, name), bytes);
    await new Promise((resolve, reject) => {
      const run = spawn(
        RSCRIPT,
        ["--vanilla", path.join(bundle, "reproduce.R")],
        {
          cwd: bundle,
          windowsHide: true,
          env: {
            ...process.env,
            LC_ALL: "",
            LANG: "",
            R_LIBS_USER: path.join(ROOT, ".runtime/library"),
          },
        },
      );
      let err = "";
      run.stderr.on("data", (b) => (err += b));
      run.on("error", reject);
      run.on("exit", (code) =>
        code === 0 ? resolve() : reject(new Error(err)),
      );
    });
    const svg = await fs.readFile(path.join(bundle, "reproduced.svg"), "utf8");
    assert(svg.includes("<svg"));
    await fs.writeFile(
      path.join(ROOT, "verification", "http-result.json"),
      JSON.stringify(
        {
          ok: true,
          projectVersions: 3,
          sourceRetained: true,
          reproduced: true,
          pngWidth: png.readUInt32BE(16),
        },
        null,
        2,
      ),
    );
  },
);
