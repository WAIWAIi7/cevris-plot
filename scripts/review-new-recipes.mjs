import fs from "node:fs/promises";
import path from "node:path";
import { extraRecipes } from "../shared/extensions.mjs";
import { exampleProject } from "../shared/examples.mjs";
import { ROOT, renderProject, writeJSON } from "../server/runtime.mjs";
const out = path.join(ROOT, "verification", "new-recipes");
await fs.mkdir(out, { recursive: true });
const results = [];
let next = 0;
async function worker() {
  while (next < extraRecipes.length) {
    const [id, name] = extraRecipes[next++],
      p = exampleProject(id);
    p.params.dpi = "150";
    const r = await renderProject(p, "png");
    await fs.copyFile(r.file, path.join(out, id + ".png"));
    results.push({ id, name, metadata: r.metadata });
    console.log(id + " PNG OK");
  }
}
await Promise.all([worker(), worker()]);
await writeJSON(path.join(out, "index.json"), results);
