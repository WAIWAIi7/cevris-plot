import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { CATALOG } from "../shared/catalog.mjs";
import { exampleProject } from "../shared/examples.mjs";
import {
  renderProject,
  ROOT,
  diagnostics,
  writeJSON,
} from "../server/runtime.mjs";
const info = await diagnostics();
if (!info.ready) throw new Error(info.error);
console.log(
  JSON.stringify({
    R: info.R,
    ggplot2: info.ggplot2,
    hasSimSun: info.fonts.includes("SimSun"),
    hasTimes: info.fonts.includes("Times New Roman"),
  }),
);
await fs.mkdir(path.join(ROOT, "build", "thumbnails"), { recursive: true });
await fs.mkdir(path.join(ROOT, "verification"), { recursive: true });
const results = [];
let next = 0;
async function worker() {
  while (next < CATALOG.length) {
    const recipe = CATALOG[next++];
    try {
      const p = exampleProject(recipe.id),
        start = Date.now();
      const r = await renderProject(p, "svg"),
        svg = await fs.readFile(r.file, "utf8");
      assert(svg.includes("<svg"));
      assert(svg.length > 4000);
      assert.equal(r.metadata.recipe, recipe.id);
      assert.equal(r.metadata.linewidth, 0.5);
      assert.equal(r.metadata.fontUsed, "Times New Roman");
      assert(!/[\u4e00-\u9fff]/u.test(svg), recipe.id+" contains Chinese figure text");
      await fs.copyFile(
        r.file,
        path.join(ROOT, "build", "thumbnails", recipe.id + ".svg"),
      );
      results.push({
        id: recipe.id,
        ok: true,
        ms: Date.now() - start,
        bytes: svg.length,
        warnings: r.metadata.warnings,
      });
      console.log(recipe.id + " OK");
    } catch (e) {
      results.push({ id: recipe.id, ok: false, error: e.message });
      console.log(recipe.id + " FAIL " + e.message);
    }
  }
}
await Promise.all([worker(), worker()]);
await writeJSON(path.join(ROOT, "verification", "recipes.json"), results);
if (results.some((r) => !r.ok)) process.exitCode = 1;
else {
  const p = exampleProject("violin"),
    exports = [];
  for (const format of ["png", "pdf", "tiff"]) {
    const r = await renderProject(p, format);
    const b = await fs.readFile(r.file);
    assert(b.length > 1000);
    await fs.copyFile(
      r.file,
      path.join(ROOT, "verification", "violin." + format),
    );
    exports.push({ format, bytes: b.length, metadata: r.metadata });
  }
  const changed = structuredClone(p);
  changed.params.linewidth = 1.25;
  changed.params.outline = "none";
  const base = await renderProject(p, "svg"),
    modified = await renderProject(changed, "svg");
  assert.notEqual(base.key, modified.key);
  assert.equal(modified.metadata.linewidth, 1.25);
  assert.notEqual(
    await fs.readFile(base.file, "utf8"),
    await fs.readFile(modified.file, "utf8"),
  );
  await writeJSON(path.join(ROOT, "verification", "exports.json"), exports);
  console.log("All recipes, four formats and parameter effects passed.");
}
