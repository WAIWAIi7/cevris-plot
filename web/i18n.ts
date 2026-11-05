import { useState } from "react";
import messages from "./messages-en.json";
import { CHART_TYPES } from "../shared/chart-types.mjs";
import { englishDescriptions, englishNames } from "./recipe-english";
type Locale = "zh" | "en";
let locale: Locale = "zh";
export const currentLocale = () => locale;
export function useLocale(): [Locale, (v: Locale) => void] {
  const [value, setValue] = useState<Locale>(() => {
    try {
      return localStorage.getItem("figure-locale") === "en" ? "en" : "zh";
    } catch {
      return "zh";
    }
  });
  locale = value;
  const set = (next: Locale) => {
    locale = next;
    try {
      localStorage.setItem("figure-locale", next);
    } catch {}
    document.documentElement.lang = next === "en" ? "en" : "zh-CN";
    setValue(next);
  };
  document.documentElement.lang = value === "en" ? "en" : "zh-CN";
  return [value, set];
}
export function tx(text: any): any {
  if (locale !== "en" || typeof text !== "string") return text;
  if ((messages as any)[text]) return (messages as any)[text];
  if (text.startsWith("已保存为版本 "))
    return "Saved as version " + text.slice(7);
  const invalid = text.match(
    /^有(\d+)(行包含非数值，请检查所选测量列|行缺失值；请补全或明确勾选“排除缺失行”)$/,
  );
  if (invalid) return invalid[1] + tx(invalid[2]);
  const excluded = text.match(/^本次绘图排除(\d+)行缺失值，原始数据仍保留$/);
  if (excluded)
    return "Excluded " + excluded[1] + tx("行缺失值，原始数据仍保留");
  for (const axis of ["横轴", "纵轴"])
    if (text.startsWith(axis)) return tx(axis) + tx(text.slice(axis.length));
  for (const prefix of ["找不到列：", "请选择"])
    if (text.startsWith(prefix)) return tx(prefix) + text.slice(prefix.length);
  if (text.includes("；")) return text.split("；").map(tx).join("; ");
  return text;
}
const human = (s: string) =>
  s
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (x) => x.toUpperCase());
const roleNames: any = {
  group: "Group",
  value: "Value",
  series: "Series",
  component: "Stack component",
  x: "X value",
  y: "Y value",
  columns: "Numeric feature columns",
  row: "Feature / row",
  column: "Sample / column",
  subject: "Subject ID",
  label: "Label",
  term: "Category / term",
  effect: "Effect / log2 fold change",
  p: "P value",
  size: "Size",
  time: "Follow-up time",
  event: "Event (1) / censored (0)",
  start: "Start",
  end: "End",
  date: "Date",
  angle: "Direction (degrees)",
  taxon: "Taxon",
  count: "Count",
  source: "Source",
  target: "Target",
  stage1: "Initial stage",
  stage2: "Middle stage",
  stage3: "Final stage",
  first: "First measurement",
  second: "Second measurement",
  estimate: "Estimate",
  lower: "Lower bound",
  upper: "Upper bound",
  se: "Standard error",
  ratio: "Ratio",
  chromosome: "Chromosome",
  position: "Position",
  element: "Element",
  set: "Set",
  reference: "Reference value (same units)",
  sequence: "Sequence order",
};
export function localizeRecipe(r: any) {
  if (locale !== "en") return r;
  const family = CHART_TYPES.find((c) => c.recipes.includes(r.id));
  return {
    ...r,
    searchText: [
      r.name,
      r.description,
      r.family,
      ...r.roles.map((role: any) => role.label),
    ].join(" "),
    name: englishNames[r.id] || human(r.id),
    family: family?.en || tx(r.family),
    description:
      englishDescriptions[r.id] ||
      "Explore the example, map your columns and adjust the figure.",
    notes:
      englishDescriptions[r.id] ||
      "Synthetic example data. Confirm experimental units and the meaning of each mapped column before plotting.",
    roles: r.roles.map((role: any) => ({
      ...role,
      label:
        (roleNames[role.id] || human(role.id)) +
        (role.required ? "" : " (optional)"),
    })),
  };
}
const paramNames: any = {
  cloudVisible: "Show density cloud",
  cloudOpacity: "Cloud opacity",
  cloudGap: "Cloud / box / points spacing",
  boxVisible: "Show box summary",
  rainBoxWidth: "Box width",
  boxOpacity: "Box opacity",
  rainVisible: "Show raw observations",
  rainSpread: "Point spread",
  rainOpacity: "Point opacity",
  rainPanelGap: "Panel spacing (mm)",
  linewidth: "Line width (ggplot units)",
  pointSize: "Point size",
  fontSize: "Global font size (pt)",
  fontFamily: "Figure font",
  width: "Mark width",
  widthMm: "Figure width (mm)",
  heightMm: "Figure height (mm)",
  marginMm: "Global margins (mm)",
  background: "Paper background",
  panelBackground: "Plot background",
  dpi: "Raster resolution (DPI)",
  alpha: "Opacity",
  groupGap: "Group spacing",
  jitter: "Point jitter",
  showPoints: "Show observations",
  showValues: "Show values",
  errorType: "Error bars",
  summary: "Summary mark",
  outline: "Outline",
  bandwidth: "Density bandwidth",
  axisAngle: "X-axis label angle",
  yAxisAngle: "Y-axis label angle",
  legend: "Legend position",
  legendGap: "Legend item spacing (mm)",
  legendKeySize: "Legend key size (mm)",
  axisTitleGap: "Global axis-title gap (mm)",
  tickLength: "Global tick length (mm)",
  titleGap: "Title bottom spacing (pt)",
  titleSize: "Title size (pt)",
  legendSize: "Legend size (pt)",
  captionSize: "Caption size (pt)",
  titleAlign: "Title alignment (left → right)",
  titleFace: "Title face",
  titleVisible: "Show figure title",
  legendTitleVisible: "Show legend title",
  grid: "Show all major grid lines",
  gridWidth: "Grid width (ggplot units)",
  gridColor: "Grid color",
  fillColor: "Fill color",
  colorLow: "Low-value color",
  colorMid: "Midpoint color",
  colorHigh: "High-value color",
  regression: "Linear fit with 95% confidence band",
  normalization: "Value transformation",
  bins: "Number of bins",
  clusterRows: "Order rows by similarity",
  clusterColumns: "Order columns by similarity",
  cellBorder: "Cell borders",
  correlationMethod: "Correlation method",
  effectThreshold: "Absolute effect threshold",
  pThreshold: "P-value threshold",
  pKind: "P-value type",
  labelCount: "Labeled significant genes",
  logX: "Log10 X scale",
  scalePca: "Standardize variables before PCA",
  referenceLine: "Reference line position",
  omitMissing: "Exclude missing rows for rendering",
  showCI: "Show 95% confidence band",
  riskTable: "Show number-at-risk table",
  showCensor: "Show censor marks",
  riskTicks: "Risk-table time points",
  treeSize: "Clustering tree proportion",
  panelGap: "Facet gap (mm)",
  loadingScale: "Loading arrow scale",
  angleBins: "Direction bins",
  chordGap: "Node arc gap (degrees)",
  waffleCells: "Waffle cells",
  cellGap: "Cell spacing",
  edgeScale: "Edge-weight width multiplier",
  topIntersections: "Visible intersections",
  nodeWidth: "Node width",
  flowGap: "Node gap proportion",
  holeSize: "Donut hole proportion",
  swarmSpread: "Swarm width",
  radarMax: "Common scale maximum",
  associationThreshold: "Association P threshold",
  bandAlpha: "Band opacity",
  parallelScale: "Parallel-coordinate scaling",
  logAbundance: "Log abundance scale",
  rarefactionSteps: "Rarefaction evaluation points",
  sortDirection: "Sort direction",
  clusterMethod: "Linkage method",
  xMin: "X minimum",
  xMax: "X maximum",
  yMin: "Y minimum",
  yMax: "Y maximum",
};
for (const a of ["x", "y"]) {
  const axis = a.toUpperCase();
  Object.assign(paramNames, {
    [a + "AxisLabels"]: `${axis} tick labels`,
    [a + "AxisLine"]: `${axis} axis line`,
    [a + "AxisTicks"]: `${axis} tick marks`,
    [a + "AxisFontSize"]: `${axis} tick-label size (pt)`,
    [a + "AxisColor"]: `${axis} color`,
    [a + "AxisLinewidth"]: `${axis} line width (ggplot units)`,
    [a + "AxisTitleSize"]: `${axis} title size (pt)`,
    [a + "AxisTitleGap"]: `${axis} title spacing (mm)`,
    [a + "TickLength"]: `${axis} tick length (mm)`,
    [a + "Grid"]: `${axis} grid lines`,
  });
}
for (const side of ["Top", "Right", "Bottom", "Left"])
  paramNames["margin" + side] = side + " margin (mm)";
export function localizeSpec(key: string, s: any) {
  if (locale !== "en") return s;
  const hint = tx(s.hint);
  return {
    ...s,
    label: paramNames[key] || human(key),
    hint:
      hint && /[\u4e00-\u9fff]/u.test(hint)
        ? s.type === "optionalNumber"
          ? "Leave blank for automatic / inherited values."
          : undefined
        : hint,
    options: s.options
      ? Object.fromEntries(
          Object.entries(s.options).map(([k, v]) => [k, tx(v)]),
        )
      : undefined,
  };
}
