import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { exampleProject } from "../shared/examples.mjs";
import { csv } from "../server/import.mjs";
import { ROOT, RSCRIPT } from "../server/runtime.mjs";
import { createRPool } from "../server/r-workers.mjs";
import { PRODUCT, isCompatibleApp } from "../shared/identity.mjs";

test("CLI inherits chart-specific appearance and explicit overrides without replacing data", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "cevris-cli-"));
  for (const id of ["bar_plain", "manhattan", "circular_heatmap"]) {
    const example = exampleProject(id);
    await fs.writeFile(path.join(folder, "data.csv"), csv(example.data));
    await fs.writeFile(path.join(folder, "spec.json"), JSON.stringify({ input: "data.csv", recipeId: id, mapping: example.mapping, params: { fontSize: 13 } }));
    const output = path.join(folder, id + ".figure.json");
    await promisify(execFile)(process.execPath, ["scripts/figure.mjs", "create", "--spec", path.join(folder, "spec.json"), "--out", output], { cwd: ROOT, windowsHide: true });
    const actual = JSON.parse(await fs.readFile(output, "utf8"));
    for (const key of ["showPoints", "pointSize", "widthMm", "heightMm"])
      assert.equal(actual.params[key], example.params[key], id + ":" + key);
    assert.equal(actual.params.fontSize, 13);
    assert.equal(actual.data.rows.length, example.data.rows.length);
    assert.equal(actual.data.synthetic, false);
  }
});

test("brand identity recognizes old local servers for migration", () => {
  assert.equal(PRODUCT.slug, "cevris-plot");
  assert(isCompatibleApp("cevris-plot"));
  assert(isCompatibleApp("figure-studio"));
  assert(!isCompatibleApp("other-app"));
});

test("R timeout stops the interpreter and the pool can process the next request", { timeout: 25000 }, async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "cevris-worker-"));
  const script = path.join(folder, "worker.R"), pidFile = path.join(folder, "worker.pid");
  await fs.writeFile(script, `library(jsonlite)
con <- file("stdin", open="r")
repeat {
  line <- readLines(con, n=1, warn=FALSE)
  if (!length(line)) break
  request <- fromJSON(line)
  writeLines(as.character(Sys.getpid()), "worker.pid")
  if (request$args[1] == "hang") Sys.sleep(30)
  cat("@@FIGURE@@", toJSON(list(id=request$id, ok=TRUE, warm=TRUE, ms=1), auto_unbox=TRUE), "\\n", sep="")
  flush.console()
}
`);
  const pool = createRPool({ executable: RSCRIPT, script, cwd: folder, size: 1, env: { ...process.env, R_LIBS_USER: path.join(ROOT, ".runtime/library") } });
  try {
    await pool.run(["ready"], 10000);
    const oldPid = Number(await fs.readFile(pidFile, "utf8"));
    await assert.rejects(pool.run(["hang"], 150), /超过90秒/);
    await pool.run(["ready"], 10000);
    assert.notEqual(Number(await fs.readFile(pidFile, "utf8")), oldPid);
    assert.throws(() => process.kill(oldPid, 0), /ESRCH/);
  } finally { pool.close(); }
});
