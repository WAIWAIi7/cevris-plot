import fs from "node:fs/promises";
import path from "node:path";
import { PALETTES, applyPalette } from "../shared/palettes.mjs";
import { exampleProject } from "../shared/examples.mjs";
import { reconcileColors, parseProject } from "../server/model.mjs";
import {
  renderProject,
  closeRWorkers,
  ROOT,
  writeJSON,
} from "../server/runtime.mjs";
const out = path.join(ROOT, "verification", "palettes");
await fs.mkdir(out, { recursive: true });
const records = [];
try {
  for (const palette of PALETTES.filter((p) => !p.legacy)) {
    const p = reconcileColors(
      parseProject(
        exampleProject(
          palette.kind === "categorical" ? "raincloud" : "heatmap",
        ),
      ),
    );
    p.params.normalization = palette.kind === "diverging" ? "row_z" : "none";
    p.labels.title = palette.en;
    applyPalette(p, palette);
    await writeJSON(path.join(out, palette.id + ".figure.json"), p);
    for (const format of ["png", "svg"]) {
      const r = await renderProject(p, format);
      await fs.copyFile(r.file, path.join(out, palette.id + "." + format));
    }
    records.push({
      ...palette,
      recipeId: p.recipeId,
      png: palette.id + ".png",
      svg: palette.id + ".svg",
    });
  }
  await writeJSON(path.join(out, "manifest.json"), records);
  const cards = records
    .map(
      (p) =>
        `<article><h2>${p.zh} <small>${p.en}</small></h2><img src="${p.svg}" alt="${p.en}"><div class="swatches">${p.colors.map((c) => `<i style="background:${c}"></i>`).join("")}</div><a href="${p.png}">PNG</a> · <a href="${p.svg}">SVG</a> · <a href="${p.id}.figure.json">Editable project</a></article>`,
    )
    .join("");
  await fs.writeFile(
    path.join(out, "index.html"),
    `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cevris Plot · 配色审阅</title><style>body{background:#e8eff5;color:#294b64;font:15px system-ui;margin:32px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}article{background:#f4f8fa;padding:16px;border:1px solid #d4e0e9;border-radius:12px}h1{font-size:24px}h2{font-size:16px}small{display:block;font-size:12px;font-weight:400;margin-top:5px}img{width:100%;display:block}a{color:#315f7d;font-size:12px}.swatches{display:flex;height:18px;margin:12px 0}.swatches i{flex:1}</style><h1>Cevris Plot · 24 套新增配色</h1><p>真实 R 输出 · 云雨图与热图 · 固定模拟数据</p><main>${cards}</main></html>`,
  );
  console.log(
    JSON.stringify({
      directory: out,
      schemes: records.length,
      files: records.length * 3 + 2,
    }),
  );
} finally {
  await closeRWorkers();
}
