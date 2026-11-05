// Visual variants are explicit recipes: each has a data contract and an R renderer.
const cat = (id, label) => ({ id, label, type: "category", required: true });
const num = (id, label) => ({ id, label, type: "number", required: true });
const group = cat("group", "分组依据"),
  value = num("value", "测量数值"),
  series = cat("series", "系列分组");
const raw = [group, value],
  factorial = [...raw, series];
const shape = [
  "width",
  "groupGap",
  "outline",
  "errorType",
  "showPoints",
  "pointSize",
  "jitter",
  "showValues",
];
const bar = (id, name, description, controls = shape) => [
  id,
  name,
  "组间比较",
  description,
  "phenotype",
  raw,
  controls,
];
const grouped = (id, name, description) => [
  id,
  name,
  "组间比较",
  description,
  "factorial",
  factorial,
  shape,
];
export const variantRecipes = [
  bar("bar_plain", "基础柱状图", "每根柱表示一组原始观测的均值。"),
  bar("bar_error", "误差柱状图", "均值与可选的 SD、SEM 或 95% 置信区间。"),
  bar("bar_horizontal", "横向柱状图", "横向排列均值，适合较长的组名。"),
  bar(
    "bar_horizontal_points",
    "横向散点柱状图",
    "横向均值柱叠加每个独立观测。",
  ),
  bar("bar_outline", "空心柱状图", "以空心轮廓呈现均值，保留组别颜色。"),
  bar("bar_sorted", "排序柱状图", "按均值排序，原始数据保持不变。"),
  bar("bar_labels", "数值标注柱状图", "在各组均值上方显示数值标签。"),
  grouped("grouped_bar_plain", "分组基础柱状图", "两层分类的均值并列展示。"),
  grouped(
    "grouped_bar_points",
    "分组散点柱状图",
    "并列均值柱与各组合的原始观测。",
  ),
  grouped(
    "grouped_bar_horizontal",
    "横向分组柱状图",
    "横向比较两层分类的均值和误差。",
  ),
  [
    "grouped_stacked_bar",
    "分组堆叠柱状图",
    "组间比较",
    "每个主组中并列不同系列，各系列内按组成堆叠。",
    "grouped_composition",
    [...factorial, cat("component", "堆叠组成")],
    ["width", "outline"],
  ],
  [
    "bar_line",
    "柱状与折线组合图",
    "组间比较",
    "同一单位下比较观测汇总值与给定参照值；共用一个数值轴。",
    "bar_reference",
    [...raw, num("reference", "参照数值")],
    ["width", "outline", "pointSize", "showValues"],
  ],
  grouped(
    "grouped_box",
    "分组箱线图",
    "两层分类的中位数、四分位数与原始观测。",
  ),
  grouped("grouped_violin", "分组小提琴图", "两层分类的概率密度与原始观测。"),
  [
    "circular_bar",
    "环形柱状图",
    "组间比较",
    "从零起始的扇区面积表示各类别的非负汇总值。",
    "parts",
    [cat("group", "类别名称"), value],
    ["outline", "showValues"],
  ],
  [
    "binary_heatmap",
    "二值热图",
    "矩阵与组学",
    "展示明确记录的存在与缺失，只接受 0 和 1。",
    "binary_matrix",
    [cat("row", "特征名称"), cat("column", "样本名称"), value],
    ["colorLow", "colorHigh", "cellBorder"],
  ],
  [
    "correlation_bubble",
    "相关性气泡矩阵",
    "矩阵与组学",
    "气泡面积表示相关系数绝对值，颜色表示符号。",
    "multivariate",
    [{ id: "columns", label: "数值特征列", type: "multi", required: true }],
    ["correlationMethod", "colorLow", "colorMid", "colorHigh", "pointSize"],
  ],
  [
    "circular_heatmap",
    "环形热图",
    "矩阵与组学",
    "矩阵按同心圆展开，用颜色展示数值；不进行聚类。",
    "matrix",
    [cat("row", "特征名称"), cat("column", "样本名称"), value],
    ["colorLow", "colorMid", "colorHigh", "cellBorder", "normalization"],
  ],
];
for (const r of variantRecipes) {
  if (["grouped_box", "grouped_violin"].includes(r[0]))
    r[6] = [
      "width",
      "groupGap",
      "outline",
      "showPoints",
      "pointSize",
      "jitter",
    ];
  if (r[0] === "bar_outline") r[6] = r[6].filter((k) => k !== "outline");
}
export const variantIds = new Set(variantRecipes.map((r) => r[0]));
export const variantNotes = Object.fromEntries(
  variantRecipes.map((r) => [
    r[0],
    r[4] === "phenotype" || r[4] === "factorial"
      ? "输入逐行原始观测；均值与误差在组内计算，不自动进行显著性检验。"
      : r[3],
  ]),
);
export function variantExample(kind, rand) {
  if (kind === "grouped_composition") {
    const rows = ["Control", "Low salt", "High salt"].flatMap((Treatment, i) =>
      ["Cultivar A", "Cultivar B"].flatMap((Series) =>
        ["Root", "Stem", "Leaf"].map((Component) => ({
          Treatment,
          Series,
          Component,
          Dry_weight: +(2.1 + rand() * 4.8 - i * 0.35).toFixed(2),
        })),
      ),
    );
    return {
      rows,
      mapping: {
        group: "Treatment",
        series: "Series",
        component: "Component",
        value: "Dry_weight",
      },
      title: "Biomass composition",
      context:
        "Synthetic dry weights (g); each row is an additive component of one treatment and cultivar.",
    };
  }
  if (kind === "bar_reference") {
    const rows = ["Control", "Low salt", "High salt", "Recovery"].map(
      (Treatment, i) => ({
        Treatment,
        Observed: [62.8, 48.3, 35.7, 54.6][i],
        Reference: [59.4, 52.1, 39.8, 57.2][i],
      }),
    );
    return {
      rows,
      mapping: {
        group: "Treatment",
        value: "Observed",
        reference: "Reference",
      },
      title: "Observed and reference root length",
      context:
        "Synthetic precomputed values in mm. Both layers use the same unit and axis; no statistical fitting.",
    };
  }
  if (kind === "binary_matrix") {
    const rows = Array.from({ length: 12 }, (_, i) =>
      Array.from({ length: 8 }, (_, j) => ({
        Feature: `Gene ${i + 1}`,
        Sample: `Sample ${j + 1}`,
        Presence: rand() < (j < 4 ? 0.3 : 0.65) ? 1 : 0,
      })),
    ).flat();
    return {
      rows,
      mapping: { row: "Feature", column: "Sample", value: "Presence" },
      title: "Feature presence",
      context:
        "Synthetic complete presence/absence matrix. Zero denotes explicitly observed absence, not missing data.",
    };
  }
  return null;
}
export function configureVariant(id, data, params) {
  if (!variantIds.has(id)) return;
  params.legend =
    id.startsWith("grouped_") ||
    [
      "bar_line",
      "circular_bar",
      "binary_heatmap",
      "correlation_bubble",
      "circular_heatmap",
    ].includes(id)
      ? "right"
      : "none";
  params.showPoints = [
    "bar_horizontal_points",
    "grouped_bar_points",
    "grouped_box",
    "grouped_violin",
  ].includes(id);
  params.showValues = ["bar_labels"].includes(id);
  params.errorType = [
    "bar_error",
    "bar_horizontal",
    "bar_horizontal_points",
    "grouped_bar_points",
    "grouped_bar_horizontal",
  ].includes(id)
    ? "sd"
    : "none";
  if (id === "circular_heatmap" || id === "correlation_bubble") {
    params.heightMm = 150;
    params.widthMm = 175;
  }
  if (id === "bar_outline") params.outline = "darker";
  if (id === "grouped_stacked_bar") {
    params.axisAngle = "45";
    params.widthMm = 180;
    params.heightMm = 125;
  }
  if (id === "circular_bar") {
    params.legend = "bottom";
    params.heightMm = 140;
  }
}
