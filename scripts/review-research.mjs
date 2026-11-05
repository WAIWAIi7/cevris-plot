import fs from "node:fs/promises";
import path from "node:path";
import { RESEARCH } from "../shared/recipes-v4.mjs";
import { exampleProject } from "../shared/examples.mjs";
import {
  ROOT,
  renderProject,
  writeJSON,
  closeRWorkers,
} from "../server/runtime.mjs";
const out = path.join(ROOT, "verification", "research-v0.4");
await fs.mkdir(out, { recursive: true });
await fs.mkdir(path.join(ROOT, "build", "thumbnails"), { recursive: true });
let next = 0;
const results = [];
const selected = process.argv.slice(2),
  recipes = selected.length
    ? RESEARCH.filter((r) => selected.includes(r.id))
    : RESEARCH;
async function worker() {
  while (next < recipes.length) {
    const { id, name } = recipes[next++];
    try {
      const p = exampleProject(id);
      p.params.dpi = "150";
      for (const format of ["svg", "png"]) {
        const r = await renderProject(p, format);
        await fs.copyFile(r.file, path.join(out, `${id}.${format}`));
        if (format === "svg")
          await fs.copyFile(
            r.file,
            path.join(ROOT, "build", "thumbnails", `${id}.svg`),
          );
        if (format === "png")
          results.push({ id, name, metadata: r.metadata, ok: true });
      }
      console.log(`${id} OK`);
    } catch (e) {
      results.push({ id, name, ok: false, error: e.message });
      console.log(`${id} FAIL ${e.message}`);
    }
  }
}
try {
  await Promise.all([worker(), worker()]);
  await writeJSON(
    path.join(out, selected.length ? "selected.json" : "index.json"),
    results,
  );
  if (results.some((r) => !r.ok)) process.exitCode = 1;
} finally {
  closeRWorkers();
}
