import fs from "node:fs/promises";
import path from "node:path";
import { PACK } from "../shared/recipes-v3.mjs";
import { exampleProject } from "../shared/examples.mjs";
import {
  ROOT,
  renderProject,
  writeJSON,
  closeRWorkers,
} from "../server/runtime.mjs";
const out = path.join(ROOT, "verification", "pack-v0.3");
await fs.mkdir(out, { recursive: true });
let next = 0;
const results = [];
async function worker() {
  while (next < PACK.length) {
    const { id, name } = PACK[next++],
      p = exampleProject(id);
    p.params.dpi = "150";
    const r = await renderProject(p, "png");
    await fs.copyFile(r.file, path.join(out, id + ".png"));
    results.push({ id, name, metadata: r.metadata });
    console.log(id + " PNG OK");
  }
}
try {
  await Promise.all([worker(), worker()]);
  await writeJSON(path.join(out, "index.json"), results);
} finally {
  closeRWorkers();
}
