import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { zipSync, strToU8 } from "fflate";
import { CATALOG, PARAMS } from "../shared/catalog.mjs";
import { PRODUCT } from "../shared/identity.mjs";
import { exampleProject } from "../shared/examples.mjs";
import { inputGuide } from "../shared/input-guide.mjs";
import {
  parseProject,
  validateData,
  profile,
  suggestMapping,
  reconcileColors,
  transform,
  recommendations,
} from "./model.mjs";
import {
  ROOT,
  DATA,
  diagnostics,
  writeJSON,
  readJSON,
  enqueue,
  getJob,
  renderProject,
  RENDERER_SOURCE,
  prewarmRWorkers,
} from "./runtime.mjs";
import { importFile, csv } from "./import.mjs";
import { exportR } from "./r-export.mjs";
import { parseComposition, renderComposition } from "./composition.mjs";
const port = Number(process.env.FIGURE_PORT || 47831),
  token = randomBytes(32).toString("hex");
const projectsDir = path.join(DATA, "projects"),
  stylesDir = path.join(DATA, "styles");
await fs.mkdir(projectsDir, { recursive: true });
await fs.mkdir(stylesDir, { recursive: true });
const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const validId = (id) => {
  if (!uuid.test(id)) throw new Error("项目编号无效");
  return id;
};
async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    // Projects include both original and plotting tables, plus original bytes.
    if (size > 64 * 1024 * 1024) throw new Error("项目请求超过64MB，请减少数据量或拆分组图");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("无法读取提交的数据");
  }
}
const json = (res, value, status = 200) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
};
async function sendFile(res, file, type, download) {
  const bytes = await fs.readFile(file);
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": "no-cache",
    ...(download
      ? {
          "Content-Disposition":
            "attachment; filename*=UTF-8''" + encodeURIComponent(download),
        }
      : {}),
  });
  res.end(bytes);
}
async function list(dir) {
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
  const entries = await Promise.all(
    files.map(async (f) => {
      try {
        const p = await readJSON(path.join(dir, f));
        return {
          id: p.id,
          name: p.name,
          recipeId: p.recipeId,
          revision: p.revision,
          updatedAt: p.updatedAt,
        };
      } catch {
        return null;
      }
    }),
  );
  return entries
    .filter(Boolean)
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}
let runtime = await diagnostics(),
  saveSerial = Promise.resolve();
if (runtime.ready) prewarmRWorkers().catch(() => {});
const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'",
  );
  try {
    if (!["127.0.0.1:" + port, "localhost:" + port].includes(req.headers.host))
      return json(res, { error: "仅允许本机访问" }, 403);
    if (
      req.headers.origin &&
      !["http://127.0.0.1:" + port, "http://localhost:" + port].includes(
        req.headers.origin,
      )
    )
      return json(res, { error: "不允许跨站请求" }, 403);
    if (req.headers["sec-fetch-site"] === "cross-site")
      return json(res, { error: "不允许跨站请求" }, 403);
    const u = new URL(req.url, "http://127.0.0.1:" + port),
      route = u.pathname;
    if (route === "/api/session" && req.method === "GET")
      return json(res, { app: PRODUCT.slug, name: PRODUCT.name, token });
    const publicFile =
      route.startsWith("/api/files/") || route.startsWith("/thumbnails/");
    if (
      route.startsWith("/api/") &&
      !publicFile &&
      req.headers.authorization !== "Bearer " + token
    )
      return json(res, { error: "本地会话已失效，请刷新页面" }, 401);
    if (route === "/api/health") {
      runtime = await diagnostics();
      return json(res, {
        ...runtime,
        version: PRODUCT.version,
        recipes: CATALOG.length,
        offline: true,
      });
    }
    if (route === "/api/catalog")
      return json(res, { recipes: CATALOG, params: PARAMS, runtime });
    if (route.startsWith("/api/input-guide/"))
      return json(res, inputGuide(route.split("/")[3]));
    if (route.startsWith("/api/examples/")) {
      const id = route.split("/")[3],
        p = exampleProject(id);
      if (u.searchParams.get("download") === "csv") {
        res.writeHead(200, {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            "attachment; filename*=UTF-8''" +
            encodeURIComponent(id + "-demo-data.csv"),
        });
        return res.end(csv(p.data));
      }
      return json(res, p);
    }
    if (route === "/api/import" && req.method === "POST")
      return json(res, await importFile(await body(req)));
    if (route === "/api/inspect" && req.method === "POST") {
      const raw = await body(req),
        p = parseProject(raw);
      return json(res, {
        project: p,
        profile: profile(p.data),
        check: validateData(p),
        mapping: suggestMapping(p.recipeId, p.data),
      });
    }
    if (route === "/api/recommend" && req.method === "POST") {
      const p = parseProject(await body(req));
      return json(res, recommendations(p.data, p.context));
    }
    if (route === "/api/transform" && req.method === "POST") {
      const b = await body(req);
      return json(res, transform(parseProject(b.project), b.action));
    }
    if (route === "/api/preview" && req.method === "POST") {
      const b = await body(req),
        result = await renderProject(b.project, "svg");
      return json(res, {
        svg: await fs.readFile(result.file, "utf8"),
        metadata: result.metadata,
        check: result.check,
      });
    }
    if (route === "/api/r-source" && req.method === "POST") {
      const b = await body(req),
        source = exportR(b.project);
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Disposition": "attachment; filename=figure.R",
      });
      return res.end(source);
    }
    if (route === "/api/composition/validate" && req.method === "POST")
      return json(res, parseComposition(await body(req)));
    if (route === "/api/composition/render" && req.method === "POST") {
      const b = await body(req),
        result = await renderComposition(b.composition, b.format || "svg");
      return json(res, {
        url: "/api/files/" + result.key + "." + result.format,
        metadata: result.metadata,
      });
    }
    if (route === "/api/render" && req.method === "POST") {
      const b = await body(req),
        p = reconcileColors(parseProject(b.project)),
        check = validateData(p);
      if (!check.ok)
        return json(res, { error: check.issues.join("；"), check }, 422);
      if (!runtime.ready) runtime = await diagnostics();
      if (!runtime.ready) return json(res, { error: runtime.error }, 503);
      const format = b.format || "svg";
      if (!["svg", "png", "pdf", "tiff"].includes(format))
        throw new Error("不支持的格式");
      return json(res, enqueue(p, format), 202);
    }
    if (route.startsWith("/api/jobs/")) {
      const job = getJob(route.split("/")[3]);
      return json(res, job || { error: "任务已过期" }, job ? 200 : 404);
    }
    if (publicFile) {
      const file = route.split("/").at(-1),
        types = {
          svg: "image/svg+xml",
          png: "image/png",
          pdf: "application/pdf",
          tiff: "image/tiff",
        };
      if (route.startsWith("/thumbnails/")) {
        if (!CATALOG.some((r) => file === r.id + ".svg"))
          return json(res, { error: "找不到预览" }, 404);
        return await sendFile(
          res,
          path.join(ROOT, "build", "thumbnails", file),
          "image/svg+xml",
        );
      }
      if (!/^[a-f0-9]{64}\.(svg|png|pdf|tiff)$/.test(file))
        throw new Error("文件编号无效");
      return await sendFile(
        res,
        path.join(DATA, "renders", file),
        types[file.split(".").at(-1)],
        u.searchParams.has("download")
          ? "科研图形." + file.split(".").at(-1)
          : null,
      );
    }
    if (route === "/api/projects" && req.method === "GET")
      return json(res, await list(projectsDir));
    if (route === "/api/projects" && req.method === "POST") {
      const p = reconcileColors(parseProject(await body(req)));
      saveSerial = saveSerial
        .catch(() => {})
        .then(async () => {
          let old = null;
          if (p.id) {
            old = await readJSON(
              path.join(projectsDir, validId(p.id) + ".json"),
            );
            if (old.revision !== p.revision)
              return json(
                res,
                { error: "该项目已在其他窗口修改，请重新打开后再保存。" },
                409,
              );
          }
          p.id ??= randomUUID();
          p.revision++;
          p.updatedAt = new Date().toISOString();
          await writeJSON(
            path.join(projectsDir, p.id, String(p.revision) + ".json"),
            p,
          );
          await writeJSON(path.join(projectsDir, p.id + ".json"), p);
          return json(res, p);
        });
      return await saveSerial;
    }
    if (route.startsWith("/api/projects/")) {
      const parts = route.split("/"),
        id = validId(parts[3]);
      if (parts[4] === "history") {
        const dir = path.join(projectsDir, id),
          files = (await fs.readdir(dir)).filter((f) => /^\d+\.json$/.test(f));
        const snapshots = await Promise.all(
          files.map(async (f) => {
            const p = await readJSON(path.join(dir, f));
            return {
              revision: p.revision,
              updatedAt: p.updatedAt,
              name: p.name,
            };
          }),
        );
        return json(
          res,
          snapshots.sort((a, b) => b.revision - a.revision),
        );
      }
      if (parts[4] && /^\d+$/.test(parts[4]))
        return json(
          res,
          await readJSON(path.join(projectsDir, id, parts[4] + ".json")),
        );
      return json(res, await readJSON(path.join(projectsDir, id + ".json")));
    }
    if (route === "/api/styles" && req.method === "GET")
      return json(res, await list(stylesDir));
    if (route === "/api/styles" && req.method === "POST") {
      const b = await body(req),
        p = parseProject(b.project);
      const s = {
        id: randomUUID(),
        name: String(b.name || "我的样式").slice(0, 100),
        params: Object.fromEntries(
          Object.entries(p.params).filter(
            ([key]) => PARAMS[key].section !== "analysis",
          ),
        ),
        colors: p.colors,
        paletteId: p.paletteId,
        updatedAt: new Date().toISOString(),
      };
      // A style never contains measurements, labels, experimental context or results.
      await writeJSON(path.join(stylesDir, s.id + ".json"), s);
      return json(res, s);
    }
    if (route.startsWith("/api/styles/"))
      return json(
        res,
        await readJSON(
          path.join(stylesDir, validId(route.split("/")[3]) + ".json"),
        ),
      );
    if (route === "/api/bundle" && req.method === "POST") {
      const p = parseProject(await body(req)),
        r = await renderProject(p, "svg"),
        versions = { R: runtime.R, packages: runtime.packages };
      const files = {
        "project.figure.json": strToU8(JSON.stringify(p, null, 2)),
        "original-data.csv": strToU8(csv(p.originalData)),
        "plot-data.csv": strToU8(csv(p.data)),
        "renderer.R": strToU8(RENDERER_SOURCE),
        "figure.svg": new Uint8Array(await fs.readFile(r.file)),
        "provenance.json": strToU8(JSON.stringify(r.metadata, null, 2)),
        "package-versions.json": strToU8(JSON.stringify(versions, null, 2)),
        "reproduce.R": strToU8(
          'args <- commandArgs(FALSE)\nf <- sub("^--file=", "", args[grepl("^--file=", args)])\nif(length(f)) setwd(dirname(normalizePath(f)))\nstatus <- system2(file.path(R.home("bin"), "Rscript"), c("--vanilla", "renderer.R", "project.figure.json", "reproduced.svg", "svg"))\nquit(status=status)\n',
        ),
        "使用说明.txt": strToU8(
          "project.figure.json 可在科研绘图中重新打开并编辑。\n复现：安装 package-versions.json 所记录的 R 与包，再运行 Rscript reproduce.R。\n项目中的原始数据、变换记录、参数及实际字体信息均保留。缺少字体会报错，不会静默替换。\n",
        ),
      };
      if (p.originalData.source?.base64)
        files[
          "source-original." +
            (p.originalData.source.name
              .split(".")
              .pop()
              .replace(/[^a-z0-9]/gi, "") || "dat")
        ] = Buffer.from(p.originalData.source.base64, "base64");
      res.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Disposition":
          "attachment; filename*=UTF-8''" +
          encodeURIComponent(p.name + "-复现包.zip"),
      });
      return res.end(Buffer.from(zipSync(files)));
    }
    if (route.startsWith("/api/"))
      return json(res, { error: "找不到此操作" }, 404);
    const staticName = route === "/" ? "index.html" : route.slice(1);
    if (!["index.html", "app.js", "app.css"].includes(staticName))
      return json(res, { error: "找不到文件" }, 404);
    return await sendFile(
      res,
      path.join(ROOT, "build", staticName),
      staticName.endsWith(".js")
        ? "text/javascript; charset=utf-8"
        : staticName.endsWith(".css")
          ? "text/css; charset=utf-8"
          : "text/html; charset=utf-8",
    );
  } catch (e) {
    json(
      res,
      {
        error: e.issues
          ? e.issues.map((x) => x.path.join(".") + "：" + x.message).join("；")
          : e.message,
      },
      e.code === "ENOENT" ? 404 : 400,
    );
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log("科研绘图已启动：http://127.0.0.1:" + port),
);
