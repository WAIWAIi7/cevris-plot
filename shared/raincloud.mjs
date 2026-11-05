// Density, robust summary and raw observations share one measurement scale.
export const raincloudIds = new Set([
  "raincloud",
  "raincloud_horizontal",
  "grouped_raincloud",
]);
const role = (id, label, type) => ({ id, label, type, required: true });
const roles = [
  role("group", "分组依据", "category"),
  role("value", "测量数值", "number"),
];
export const raincloudControls = [
  "groupGap",
  "outline",
  "cloudVisible",
  "width",
  "bandwidth",
  "cloudOpacity",
  "cloudGap",
  "boxVisible",
  "rainBoxWidth",
  "boxOpacity",
  "rainVisible",
  "pointSize",
  "rainSpread",
  "rainOpacity",
];
export const raincloudRecipes = [
  [
    "raincloud",
    "云雨图（竖向）",
    "数据分布",
    "半密度云、箱线与原始散点，共同展示每组数据。",
    "raincloud_data",
    roles,
    raincloudControls,
  ],
  [
    "raincloud_horizontal",
    "云雨图（横向）",
    "数据分布",
    "横向排列云、箱线与散点，适合较长的组名。",
    "raincloud_data",
    roles,
    raincloudControls,
  ],
  [
    "grouped_raincloud",
    "分组云雨图",
    "数据分布",
    "按实验条件分面，在相同数值尺度上比较各系列的完整分布。",
    "raincloud_grouped_data",
    [...roles, role("series", "系列分组", "category")],
    [...raincloudControls, "rainPanelGap"],
  ],
];
const range = (label, min, max, step, value, section, hint) => ({
  label,
  type: "range",
  min,
  max,
  step,
  default: value,
  section,
  ...(hint ? { hint } : {}),
});
export const raincloudParams = {
  cloudVisible: {
    label: "显示密度云",
    type: "boolean",
    default: true,
    section: "cloud",
  },
  cloudOpacity: range("密度云不透明度", 0.1, 1, 0.05, 0.75, "cloud"),
  cloudGap: range(
    "云、箱线与散点间距",
    0.02,
    0.4,
    0.02,
    0.1,
    "cloud",
    "只移动组件，不改变测量数值。",
  ),
  boxVisible: {
    label: "显示箱线",
    type: "boolean",
    default: true,
    section: "rainbox",
  },
  rainBoxWidth: range("箱体宽度", 0.04, 0.3, 0.02, 0.12, "rainbox"),
  boxOpacity: range("箱体不透明度", 0.1, 1, 0.05, 0.35, "rainbox"),
  rainVisible: {
    label: "显示原始散点",
    type: "boolean",
    default: true,
    section: "rain",
  },
  rainSpread: range(
    "散点铺开宽度",
    0,
    0.3,
    0.01,
    0.1,
    "rain",
    "仅沿分组方向散开；测量值不抖动。",
  ),
  rainOpacity: range("散点不透明度", 0.1, 1, 0.05, 0.85, "rain"),
  rainPanelGap: range("分面间距（毫米）", 1, 15, 0.5, 4, "canvas"),
};
export function raincloudExample(kind, rand, normal) {
  if (!["raincloud_data", "raincloud_grouped_data"].includes(kind)) return null;
  const grouped = kind === "raincloud_grouped_data";
  const treatments = grouped
    ? ["Control", "Salt stress"]
    : ["Control", "Low salt", "High salt", "Recovery"];
  const rows = treatments.flatMap((group, j) =>
    (grouped ? ["Wild type", "Line A"] : [null]).flatMap((series, k) => {
      const count = (grouped ? [31, 37, 34, 29] : [43, 36, 39, 47])[
        grouped ? j * 2 + k : j
      ];
      return Array.from({ length: count }, (_, i) => {
        const base = grouped
          ? [58, 34][j] + k * (j ? 11 : 3)
          : [59, 48, 31, 52][j];
        // Unequal sample sizes, skew, occasional long roots, and distinct spreads.
        const root = Math.max(
          7,
          base +
            normal() * [6.2, 8.4, 5.1, 9.3][j] +
            (Math.exp(normal() * 0.55) - 1) * 5 +
            (rand() < 0.055 ? 13 + rand() * 7 : 0),
        );
        return {
          Sample: `Plant-${j + 1}-${k + 1}-${String(i + 1).padStart(2, "0")}`,
          Treatment: group,
          ...(grouped ? { Genotype: series } : {}),
          "Root length (mm)": +root.toFixed(2),
        };
      });
    }),
  );
  return {
    rows,
    mapping: {
      group: "Treatment",
      value: "Root length (mm)",
      ...(grouped ? { series: "Genotype" } : {}),
    },
    title: "Root length distributions",
    context:
      "Synthetic independent rice seedlings, one root-length measurement per plant in millimeters. Unequal group sizes and skewed distributions are intentional. These observations are not real experimental results.",
  };
}
export function configureRaincloud(id, data, params) {
  if (!raincloudIds.has(id)) return;
  Object.assign(params, {
    pointSize: 1.3,
    width: 0.5,
    groupGap: 0.4,
    legend: "none",
    heightMm: id === "grouped_raincloud" ? 145 : 115,
    widthMm: 175,
  });
}
export function validateRaincloud(p, rows, issues, warnings) {
  if (!raincloudIds.has(p.recipeId)) return;
  if (!p.params.cloudVisible && !p.params.boxVisible && !p.params.rainVisible)
    issues.push("至少保留密度云、箱线或散点中的一个图层");
  const grouped = p.recipeId === "grouped_raincloud",
    groups = new Map();
  for (const row of rows) {
    const key = JSON.stringify([
      row[p.mapping.group],
      ...(grouped ? [row[p.mapping.series]] : []),
    ]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(Number(row[p.mapping.value]));
  }
  if (grouped && new Set(rows.map((r) => r[p.mapping.group])).size > 12)
    issues.push("分组云雨图最多支持12个分面，请筛选实验条件");
  if (!p.params.cloudVisible) return;
  if ([...groups.values()].some((v) => v.length < 3))
    issues.push(
      "密度云每个分组组合至少需要3条观测；可关闭密度云保留箱线和散点",
    );
  if ([...groups.values()].some((v) => new Set(v).size < 2))
    issues.push(
      "某个分组组合的数值完全相同，无法估计密度；可关闭密度云保留箱线和散点",
    );
  if ([...groups.values()].some((v) => v.length < 10))
    warnings.push(
      "部分组少于10条观测，密度云对平滑程度较敏感，请同时查看原始散点",
    );
}
