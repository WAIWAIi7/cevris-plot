// Execute every exported R file in isolation; no workbench source is loaded by R.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { CATALOG } from "../shared/catalog.mjs";
import { exampleProject } from "../shared/examples.mjs";
import { exportR } from "../server/r-export.mjs";
import { ROOT, RSCRIPT } from "../server/runtime.mjs";
const output = path.join(ROOT, "verification", "standalone-r");
await fs.mkdir(output, { recursive: true });
const results = [];
let next = 0;
async function worker() {
  while (next < CATALOG.length) {
    const recipe = CATALOG[next++], project = exampleProject(recipe.id);
    const dir = path.join(output, recipe.id), start = Date.now();
    try {
      await fs.mkdir(dir, { recursive: true });
      const script = path.join(dir, "reproduce.R");
      await fs.writeFile(script, exportR(project));
      await promisify(execFile)(RSCRIPT, ["--vanilla", script], {
        cwd: dir, windowsHide: true, timeout: 90000, maxBuffer: 2 * 1024 * 1024,
        env: { ...process.env, R_LIBS_USER: path.join(ROOT, ".runtime", "library") },
      });
      const meta = JSON.parse(await fs.readFile(path.join(dir, "figure.svg.json"), "utf8"));
      const svg = await fs.readFile(path.join(dir, "figure.svg"), "utf8");
      assert.equal(meta.recipe, recipe.id);
      assert.equal(meta.rows, project.data.rows.length);
      assert(svg.includes("<svg") && svg.length > 4000);
      results.push({ id: recipe.id, ok: true, rows: meta.rows, ms: Date.now() - start });
      console.log(recipe.id + " OK");
    } catch (error) {
      results.push({ id: recipe.id, ok: false, error: error.message });
      console.error(recipe.id + " FAIL " + error.message);
    }
  }
}
await Promise.all([worker(), worker()]);
await fs.writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2));
console.log(`${results.filter(r => r.ok).length}/${CATALOG.length} standalone R exports passed.`);
if (results.some(r => !r.ok)) process.exitCode = 1;
