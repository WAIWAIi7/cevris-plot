import { variantIds } from "./recipes-v6.mjs";
import { packAxes } from "./recipes-v3.mjs";
import { researchAxes } from "./recipes-v4.mjs";
import { manhattanExample } from "./manhattan-example.mjs";
const role = (id, label, type, required = true) => ({
  id,
  label,
  type,
  required,
});
const number = (id, label) => role(id, label, "number"),
  category = (id, label) => role(id, label, "category");
const group = role("group", "系列分组（可选）", "category", false);
const xy = [number("x", "横轴数值"), number("y", "纵轴数值"), group];
export const extraRecipes = [
  [
    "mean_interval",
    "均值区间图",
    "组间比较",
    "以点和明确类型的误差线比较均值，保留原始观测。",
    "phenotype",
    [category("group", "分组依据"), number("value", "测量数值")],
    ["pointSize", "groupGap", "errorType", "showPoints", "jitter", "outline"],
  ],
  [
    "dumbbell",
    "哑铃图",
    "时间与配对",
    "逐个条目连接两个已提供的测量值。",
    "measurement_pair",
    [
      category("term", "条目名称"),
      number("first", "第一个测量"),
      number("second", "第二个测量"),
    ],
    ["pointSize", "colorLow", "colorHigh", "outline"],
  ],
  [
    "bland_altman",
    "Bland–Altman 一致性图",
    "一致性与诊断",
    "同一样本两种方法的均值与差值，显示偏倚和一致性界限。",
    "measurement_pair",
    [
      category("subject", "独立样本编号"),
      number("first", "方法一"),
      number("second", "方法二"),
    ],
    ["pointSize", "fillColor", "outline", "showReference"],
  ],
  [
    "qq",
    "正态 Q–Q 图",
    "一致性与诊断",
    "比较观测分位数和正态理论分位数，不自动作正态性结论。",
    "phenotype",
    [number("value", "测量数值"), group],
    ["pointSize", "outline", "showReference"],
  ],
  [
    "area",
    "面积图",
    "时间与配对",
    "从零基线显示各组连续变化；不同组透明叠放，不求和。",
    "time",
    xy,
    ["outline", "showPoints", "pointSize"],
  ],
  [
    "ribbon",
    "区间带折线图",
    "时间与配对",
    "显示已有的估计曲线和上下界；区间含义由输入者注明。",
    "time_interval",
    [...xy, number("lower", "区间下限"), number("upper", "区间上限")],
    ["showPoints", "pointSize", "bandAlpha"],
  ],
  [
    "roc",
    "ROC 曲线",
    "模型评估",
    "展示已有的假阳性率与真阳性率，保持提供的阈值路径。",
    "roc_curve",
    [number("x", "假阳性率"), number("y", "真阳性率"), group],
    ["showPoints", "pointSize", "showReference"],
  ],
  [
    "precision_recall",
    "PR 曲线",
    "模型评估",
    "展示已有的召回率与精确率；不重新评估模型。",
    "pr_curve",
    [number("x", "召回率"), number("y", "精确率"), group],
    ["showPoints", "pointSize"],
  ],
  [
    "survival",
    "生存曲线（已有估计）",
    "模型评估",
    "按阶梯显示已计算的生存概率，不执行生存分析或检验。",
    "survival_curve",
    [number("x", "随访时间"), number("y", "生存概率"), group],
    ["showPoints", "pointSize"],
  ],
  [
    "manhattan",
    "曼哈顿图",
    "矩阵与组学",
    "按染色体位置显示已有位点显著性；阈值由你设置。",
    "association",
    [
      category("chromosome", "染色体"),
      number("position", "染色体内位置"),
      number("p", "位点显著性"),
    ],
    [
      "pointSize",
      "colorLow",
      "colorHigh",
      "associationThreshold",
      "showReference",
    ],
  ],
  [
    "dot_matrix",
    "点阵表达图",
    "矩阵与组学",
    "用颜色表示已提供的平均表达、点面积表示表达比例。",
    "expression_dot",
    [
      category("row", "基因或特征"),
      category("column", "细胞群或样本组"),
      number("value", "平均表达值"),
      number("size", "表达比例（0–1）"),
    ],
    ["pointSize", "colorLow", "colorHigh", "outline"],
  ],
  [
    "waterfall",
    "排序瀑布图",
    "组间比较",
    "按已提供的变化值排列条目，保留正负方向和零基线。",
    "ranked_effect",
    [category("term", "条目名称"), number("value", "变化数值")],
    ["width", "outline", "colorLow", "colorHigh", "sortDirection"],
  ],
];
export const extraNotes = {
  mean_interval:
    "误差线可选 SD、SEM 或均值的 t 置信区间；每行必须是独立实验单位。",
  dumbbell: "一行对应一个条目。连接两个已提供值，不自动汇总或进行配对检验。",
  bland_altman:
    "每行必须是独立样本的一对同单位测量。差值定义为方法二减方法一；近似95%一致性界限不是均值置信区间，也不是合格标准。",
  qq: "Q–Q 图用于诊断；参考线通过正态理论与观测的四分位点。不要仅凭图形判断正态性。",
  area: "横轴必须有序且每组位置唯一，纵轴不得为负。各组叠放，图形会注明这一点。",
  ribbon: "输入已有估计与上下界；请在图注中写明 SD、SE、置信区间或其他含义。",
  roc: "输入已有 ROC 点，假阳性率和真阳性率均在0到1之间。不会计算 AUC 或验证集指标。",
  precision_recall:
    "输入已有 PR 点，召回率和精确率均在0到1之间。不推断阳性率或计算 AP。",
  survival:
    "输入已有概率估计；每组概率随时间不增。此版本不绘制删失标记、风险表或置信带，不执行 Kaplan–Meier 拟合。",
  manhattan:
    "输入已有的关联分析结果；零 p 值会拒绝。默认示例阈值仅用于演示，不代表你的分析阈值。",
  dot_matrix:
    "输入按组汇总的表达值与0到1之间的表达比例；点的面积编码比例，不从单细胞原始矩阵推算。",
  waterfall: "每个条目一条记录，按数值排序；不是财务中的逐项累计瀑布图。",
};
export function axisCapabilities(id) {
  if (["raincloud_horizontal", "grouped_raincloud"].includes(id)) return ["x"];
  if (variantIds.has(id))
    return [
      "circular_bar",
      "circular_heatmap",
      "binary_heatmap",
      "correlation_bubble",
      "bar_horizontal",
      "bar_horizontal_points",
      "grouped_bar_horizontal",
    ].includes(id)
      ? []
      : ["y"];
  if (Object.hasOwn(researchAxes, id)) return researchAxes[id];
  if (Object.hasOwn(packAxes, id)) return packAxes[id];
  if (["heatmap", "correlation", "dot_matrix"].includes(id)) return [];
  if (["dumbbell", "forest", "enrichment"].includes(id)) return ["x"];
  if (
    [
      "violin",
      "box",
      "bar",
      "strip",
      "raincloud",
      "paired",
      "grouped_bar",
      "stacked_bar",
      "percent_bar",
      "lollipop",
      "mean_interval",
      "waterfall",
      "manhattan",
    ].includes(id)
  )
    return ["y"];
  return ["x", "y"];
}
export const zeroBaseline = new Set([
  ...[...variantIds].filter(
    (id) =>
      (id.startsWith("bar_") ||
        id.startsWith("grouped_bar") ||
        id === "grouped_stacked_bar") &&
      !id.includes("horizontal"),
  ),
  "bar",
  "grouped_bar",
  "stacked_bar",
  "percent_bar",
  "lollipop",
  "area",
  "waterfall",
  "histogram",
]);
export function expansionExample(kind, rand, normal) {
  const round = (n) => +n.toFixed(4);
  let rows, mapping, title, context;
  if (kind === "measurement_pair") {
    rows = Array.from({ length: 24 }, (_, i) => {
      const a = 35 + rand() * 48;
      return {
        样本: "植株" + (i + 1),
        手工测量: round(a),
        图像测量: round(a + 1.4 + normal() * 3.2),
      };
    });
    mapping = {
      subject: "样本",
      term: "样本",
      first: "手工测量",
      second: "图像测量",
    };
    title = "两种根长测量方法的比较";
    context = "模拟24株独立植株，两种方法对同一植株各测一次，单位毫米。";
  } else if (kind === "time_interval") {
    rows = ["对照组", "处理组"].flatMap((g, j) =>
      [0, 1.4, 3.2, 5.8, 8.1, 11.5].map((t) => {
        const y = 14 + 6 * Math.sqrt(t) + j * 2 + normal(),
          e = 1.6 + rand() * 1.8;
        return {
          组别: g,
          时间: t,
          估计值: round(y),
          下限: round(y - e),
          上限: round(y + e),
        };
      }),
    );
    mapping = {
      group: "组别",
      x: "时间",
      y: "估计值",
      lower: "下限",
      upper: "上限",
    };
    title = "根长估计与区间";
    context = "模拟已有的模型估计和区间上下界，仅展示，不重新拟合。";
  } else if (kind === "roc_curve" || kind === "pr_curve") {
    rows = ["模型甲", "模型乙"].flatMap((g, j) => {
      const positive = Array.from(
          { length: 43 },
          () => normal() + [1.6, 1.05][j],
        ),
        negative = Array.from({ length: 67 }, () => normal());
      const all = [
        ...positive.map((score) => ({ score, positive: true })),
        ...negative.map((score) => ({ score, positive: false })),
      ].sort((a, b) => b.score - a.score);
      let tp = 0,
        fp = 0;
      const points = [
        { 模型: g, 假阳性率: 0, 真阳性率: 0, 召回率: 0, 精确率: 1 },
      ];
      for (const a of all) {
        a.positive ? tp++ : fp++;
        points.push({
          模型: g,
          假阳性率: round(fp / negative.length),
          真阳性率: round(tp / positive.length),
          召回率: round(tp / positive.length),
          精确率: round(tp / (tp + fp)),
        });
      }
      return points;
    });
    mapping =
      kind === "roc_curve"
        ? { group: "模型", x: "假阳性率", y: "真阳性率" }
        : { group: "模型", x: "召回率", y: "精确率" };
    title = kind === "roc_curve" ? "模型的 ROC 表现" : "模型的精确率与召回率";
    context = "由模拟分类分数生成的演示曲线点；导入用户数据时只展示已有曲线。";
  } else if (kind === "survival_curve") {
    rows = ["处理组", "对照组"].flatMap((g, j) => {
      let s = 1,
        t = 0;
      return Array.from({ length: 18 }, (_, i) => {
        if (i) {
          t += 0.5 + rand() * 2;
          s *= 1 - (0.015 + rand() * (j ? 0.065 : 0.045));
        }
        return { 组别: g, 时间: round(t), 生存概率: round(s) };
      });
    });
    mapping = { group: "组别", x: "时间", y: "生存概率" };
    title = "随访过程中的生存概率";
    context = "模拟已有生存概率序列，未包含实际生存个体数据，不开展生存分析。";
  } else if (kind === "association") {
    rows = manhattanExample(rand);
    mapping = { chromosome: "Chromosome", position: "Position", p: "P" };
    title = "位点关联结果概览";
    context = "24,000 synthetic association results across 12 simulated chromosomes, with irregular spacing and local association clusters. Seed: 1729. Positions, peaks and the threshold are illustrative, not real loci or a reference assembly.";
  } else if (kind === "expression_dot") {
    rows = ["根毛细胞", "皮层细胞", "内皮层细胞", "维管细胞"].flatMap((c, j) =>
      ["基因A", "基因B", "基因C", "基因D", "基因E", "基因F"].map((g, i) => ({
        细胞群: c,
        基因: g,
        平均表达: round(0.15 + rand() * 2.5 + (i % 4 === j ? 2 : 0)),
        表达比例: round(0.06 + rand() * 0.7 + (i % 4 === j ? 0.18 : 0)),
      })),
    );
    mapping = {
      row: "基因",
      column: "细胞群",
      value: "平均表达",
      size: "表达比例",
    };
    title = "不同细胞群的标记基因";
    context = "模拟已汇总的平均表达与表达细胞比例，不是单细胞原始矩阵。";
  } else if (kind === "ranked_effect") {
    rows = Array.from({ length: 22 }, (_, i) => ({
      材料: "材料" + String(i + 1).padStart(2, "0"),
      变化率: round(normal() * 0.28 - 0.08),
    }));
    mapping = { term: "材料", value: "变化率" };
    title = "各材料的相对变化";
    context = "模拟材料相对对照的已有变化率；不是按行累计的财务图。";
  } else throw new Error("未知模拟数据类型：" + kind);
  return { rows, mapping, title, context };
}
