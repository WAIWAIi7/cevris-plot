import fs from "node:fs/promises";
import path from "node:path";
import { exampleProject } from "../shared/examples.mjs";
import { csv } from "../server/import.mjs";
import { renderProject, closeRWorkers, ROOT, writeJSON } from "../server/runtime.mjs";
const out = path.join(ROOT, "verification", "raincloud");
await fs.mkdir(out, { recursive: true });
try {
  for (const id of ["raincloud", "raincloud_horizontal", "grouped_raincloud"]) {
    const p = exampleProject(id);
    await writeJSON(path.join(out, id + ".figure.json"), p);
    await fs.writeFile(path.join(out, id + "-data.csv"), csv(p.data), "utf8");
    for (const format of ["svg", "png"]) {
      const r = await renderProject(p, format);
      await fs.copyFile(r.file, path.join(out, id + "." + format));
      await writeJSON(path.join(out, id + "." + format + ".json"), r.metadata);
      if (format === "svg") await fs.copyFile(r.file, path.join(ROOT, "build", "thumbnails", id + ".svg"));
    }
    console.log(id + ": English data, editable project, SVG and PNG ready");
  }
} finally {
  await closeRWorkers();
}
