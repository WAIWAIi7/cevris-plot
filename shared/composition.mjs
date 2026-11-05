import { activeParams, PARAMS } from "./catalog.mjs";

export const COMPOSITION_LAYOUT = Object.freeze({
  columns: 2,
  widthMm: 320,
  heightMm: 220,
  gapMm: 6,
  marginMm: 6,
  background: "#F1F5F9",
  dpi: 300,
  labels: true,
  labelSize: 12,
  labelFont: "Times New Roman",
  alignPanels: true,
});
export const emptyComposition = () => ({
  kind: "figure-composition",
  schemaVersion: 1,
  name: "Figure composition",
  layout: { ...COMPOSITION_LAYOUT },
  panels: [],
});
// Each panel is an independent snapshot. Editing one never mutates another.
export function addPanel(composition, project, id) {
  if (composition.panels.length >= 12)
    throw new Error(
      "A composition supports up to 12 panels / 一张组图最多 12 个子图",
    );
  return {
    ...composition,
    panels: [...composition.panels, { id, project: structuredClone(project) }],
  };
}
const scientific = new Set([
  "omitMissing",
  "errorType",
  "summary",
  "regression",
  "normalize",
  "bandwidth",
  "bins",
  "binwidth",
  "densityAdjust",
  "xMin",
  "xMax",
  "yMin",
  "yMax",
]);
export function syncPanelSettings(
  composition,
  sourceId,
  includeAnalysis = false,
) {
  const source = composition.panels.find((p) => p.id === sourceId);
  if (!source) throw new Error("Select a source panel / 请选择参考子图");
  const allowed = activeParams(source.project.recipeId).filter(
    (k) =>
      includeAnalysis ||
      (!scientific.has(k) &&
        PARAMS[k]?.section !== "analysis" &&
        !/threshold|cutoff|cluster|distance|transform|method|bandwidth|adjust|bins|binWidth|fcCut|pCut/i.test(
          k,
        )),
  );
  return {
    ...composition,
    panels: composition.panels.map((panel) => {
      if (
        panel.id === sourceId ||
        panel.project.recipeId !== source.project.recipeId
      )
        return panel;
      const p = structuredClone(panel.project);
      p.paletteId = source.project.paletteId ?? null;
      for (const key of allowed)
        p.params[key] = structuredClone(source.project.params[key]);
      // Bind matching group names, never transfer a color by row or group index.
      for (const name of Object.keys(p.colors))
        if (source.project.colors[name])
          p.colors[name] = source.project.colors[name];
      return { ...panel, project: p };
    }),
  };
}
