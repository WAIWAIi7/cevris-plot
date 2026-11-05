import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { parseProject, validateData, reconcileColors } from "./model.mjs";
import {
  DATA,
  hash,
  runR,
  RENDERER_SOURCE,
  writeJSON,
  readJSON,
} from "./runtime.mjs";
import { COMPOSITION_LAYOUT } from "../shared/composition.mjs";
const schema = z.object({
  kind: z.literal("figure-composition"),
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(120),
  layout: z.object({
    columns: z.number().int().min(1).max(4),
    widthMm: z.number().min(100).max(600),
    heightMm: z.number().min(80).max(600),
    gapMm: z.number().min(0).max(30),
    marginMm: z.number().min(0).max(30),
    background: z.string().regex(/^#[a-f0-9]{6}$/i),
    dpi: z.union([z.literal(150), z.literal(300), z.literal(600)]),
    labels: z.boolean(),
    labelSize: z.number().min(6).max(30),
    labelFont: z.string().min(1).max(100),
    alignPanels: z.boolean(),
  }),
  panels: z
    .array(z.object({ id: z.string().min(1).max(80), project: z.unknown() }))
    .min(1)
    .max(12),
});
export function parseComposition(raw) {
  const c = schema.parse({
    ...raw,
    layout: { ...COMPOSITION_LAYOUT, ...raw?.layout },
  });
  if (new Set(c.panels.map((p) => p.id)).size !== c.panels.length)
    throw new Error("Duplicate panel identifiers / 子图编号重复");
  c.panels = c.panels.map((panel, i) => {
    const project = reconcileColors(parseProject(panel.project)),
      check = validateData(project);
    if (!check.ok)
      throw new Error(
        `Panel ${String.fromCharCode(65 + i)}: ${check.issues.join("; ")}`,
      );
    return { ...panel, project };
  });
  const l = c.layout,
    cols = Math.min(l.columns, c.panels.length),
    rows = Math.ceil(c.panels.length / cols);
  if (
    (l.widthMm - 2 * l.marginMm - (cols - 1) * l.gapMm) / cols < 35 ||
    (l.heightMm - 2 * l.marginMm - (rows - 1) * l.gapMm) / rows -
      (l.labels ? (l.labelSize * 25.4) / 72 + 2 : 0) <
      35
  )
    throw new Error(
      "Panels are too small; enlarge the sheet or reduce columns/margins / 子图过小，请增大画布或减少行列与间距",
    );
  return c;
}
const inFlight = new Map();
export async function renderComposition(raw, format = "svg") {
  const composition = parseComposition(raw);
  if (!["svg", "pdf", "png", "tiff"].includes(format))
    throw new Error("Unsupported composition format");
  const l = composition.layout;
  if (
    ["png", "tiff"].includes(format) &&
    ((l.widthMm * l.heightMm) / 25.4 ** 2) * l.dpi ** 2 > 60e6
  )
    throw new Error(
      "Raster export exceeds 60 megapixels; reduce size or DPI / 位图超过6000万像素，请减小尺寸或分辨率",
    );
  const key = hash({ composition, format, renderer: hash(RENDERER_SOURCE) }),
    file = path.join(DATA, "renders", key + "." + format);
  if (!inFlight.has(key))
    inFlight.set(
      key,
      (async () => {
        await fs.mkdir(path.dirname(file), { recursive: true });
        try {
          const metadata = await readJSON(file + ".json");
          await fs.access(file);
          return { key, file, format, metadata };
        } catch {}
        await writeJSON(file + ".input.json", composition);
        await runR([file + ".input.json", file, format]);
        return { key, file, format, metadata: await readJSON(file + ".json") };
      })().finally(() => inFlight.delete(key)),
    );
  return inFlight.get(key);
}
