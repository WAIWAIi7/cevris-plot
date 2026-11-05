const n = (id, label) => ({ id, label, type: "number", required: true });
const c = (id, label, required = true) => ({
  id,
  label,
  type: "category",
  required,
});
const group = c("group", "颜色分组（可选）", false);
const matrix = {
  id: "columns",
  label: "数值特征列",
  type: "multi",
  required: true,
};
const r = (
  id,
  name,
  family,
  description,
  example,
  roles,
  controls,
  notes,
  axes = [],
) => ({ id, name, family, description, example, roles, controls, notes, axes });
export const RESEARCH = [
  r(
    "clustered_heatmap",
    "树状聚类热图",
    "矩阵与组学",
    "热图旁显示真实的行列聚类树，并记录距离与连接方法。",
    "matrix",
    [c("row", "特征名称"), c("column", "样本名称"), n("value", "测量值")],
    [
      "normalization",
      "clusterMethod",
      "treeSize",
      "cellBorder",
      "colorLow",
      "colorMid",
      "colorHigh",
    ],
    "需完整矩阵；欧氏距离，行列分别聚类。标准化会改变距离，树高在各方向分别缩放。",
  ),
  r(
    "dendrogram",
    "层次聚类树",
    "多变量",
    "把独立样本按数值特征聚类，展示每次合并的距离。",
    "research_matrix",
    [c("subject", "样本编号"), matrix],
    ["scalePca", "clusterMethod", "fillColor"],
    "每行一个样本；使用欧氏距离。树形聚类不是系统发育树，分支不代表进化时间。",
    ["y"],
  ),
  r(
    "scatter_matrix",
    "散点矩阵",
    "多变量",
    "同时查看多项数值变量之间的两两关系。",
    "research_matrix",
    [matrix, group],
    ["pointSize", "outline", "panelGap"],
    "2–6个非恒定数值变量；每个面板独立使用其原始变量范围，最多1000行。",
  ),
  r(
    "parallel_coordinates",
    "平行坐标图",
    "多变量",
    "沿多个变量轴追踪每个样本的指标轮廓。",
    "research_matrix",
    [c("subject", "样本编号"), matrix, group],
    ["parallelScale", "showPoints", "pointSize"],
    "2–12个变量；缩放方法可选逐列0–1或标准分数，原始数据不变。最多300个样本。",
    ["y"],
  ),
  r(
    "pca_biplot",
    "主成分双标图",
    "多变量",
    "在同一平面展示样本得分与变量载荷方向。",
    "research_matrix",
    [matrix, group],
    ["scalePca", "loadingScale", "pointSize", "outline", "fillColor"],
    "箭头为旋转载荷乘统一展示倍率；箭头长度不可直接按样本得分轴读取，倍率记录在图注。",
    ["x", "y"],
  ),
  r(
    "kaplan_meier",
    "Kaplan–Meier 生存分析图",
    "生存与随访",
    "从个体随访数据计算生存曲线、置信区间、删失标记与风险人数。",
    "individual_survival",
    [
      c("subject", "个体编号"),
      n("time", "随访时间"),
      n("event", "事件状态（1事件，0删失）"),
      group,
    ],
    [
      "showCI",
      "showCensor",
      "riskTable",
      "riskTicks",
      "bandAlpha",
      "pointSize",
    ],
    "一人一行，仅支持右删失、单终点、共同起点；不适用于竞争风险或延迟入组。不自动进行组间检验。",
    ["x"],
  ),
  r(
    "swimmer",
    "个体随访泳道图",
    "生存与随访",
    "逐个体展示随访长度，并区分事件与删失结局。",
    "individual_survival",
    [
      c("subject", "个体编号"),
      n("time", "随访时间"),
      n("event", "事件状态（1事件，0删失）"),
      group,
    ],
    ["width", "pointSize", "outline", "sortDirection"],
    "每个个体一条随访记录，从共同的零时点开始；终点形状区分事件与删失，最多60个体。",
    ["x"],
  ),
  r(
    "gantt",
    "实验时间甘特图",
    "时间与配对",
    "按真实起止时间展示实验任务、处理或测量窗口。",
    "experiment_schedule",
    [
      c("term", "任务或阶段"),
      n("start", "开始时间"),
      n("end", "结束时间"),
      group,
    ],
    ["width", "outline", "showValues"],
    "开始与结束使用相同数值时间单位；每行一个唯一任务，不自动安排或推算时间。",
    ["x"],
  ),
  r(
    "calendar_heatmap",
    "日历热图",
    "时间与配对",
    "按真实日期排列每日观测，缺测日期保留空格。",
    "daily_measurements",
    [c("date", "日期（YYYY-MM-DD）"), n("value", "每日数值")],
    ["cellBorder", "showValues", "panelGap", "colorLow", "colorHigh"],
    "同一天只能一条汇总记录，范围最多两年；周一为一周起点，空白表示缺测而非零。",
  ),
  r(
    "polar_histogram",
    "方向分布玫瑰图",
    "空间与场",
    "对0–360度角度分箱，以扇区面积编码观测频数。",
    "root_angles",
    [n("angle", "方向角度（度）")],
    ["angleBins", "clockwise", "fillColor", "outline"],
    "0度在上方，默认顺时针；360度等同0度。扇区面积与频数成比例，半径为频数平方根。",
  ),
  r(
    "rank_abundance",
    "物种等级丰度图",
    "生态多样性",
    "按丰度排序比较各样本群落的优势度与均匀度。",
    "community_counts",
    [
      c("group", "样本或群落"),
      c("taxon", "物种或分类单元"),
      n("count", "个体计数"),
    ],
    ["showPoints", "pointSize", "logAbundance"],
    "输入真实非负整数计数；各样本内部独立排序并转为相对丰度，零丰度物种不占排名。",
    ["x", "y"],
  ),
  r(
    "rarefaction",
    "个体稀释曲线",
    "生态多样性",
    "计算无放回抽样下的期望物种数，比较观测采样充分性。",
    "community_counts",
    [
      c("group", "样本或群落"),
      c("taxon", "物种或分类单元"),
      n("count", "个体计数"),
    ],
    ["rarefactionSteps", "showPoints", "pointSize"],
    "仅接受真实整数个体计数；解析期望、不随机丢弃原始数据、不外推、不生成置信带。不是样点累积曲线。",
    ["x", "y"],
  ),
  r(
    "genomic_intervals",
    "基因组区间轨道图",
    "矩阵与组学",
    "按染色体坐标展示基因、峰或候选区间，并自动避让重叠。",
    "genome_regions",
    [
      c("chromosome", "染色体"),
      n("start", "区间起点"),
      n("end", "区间终点"),
      c("label", "区间名称"),
      group,
    ],
    ["width", "showValues", "outline", "panelGap"],
    "输入0基半开区间[start,end)，需自行统一基因组版本；按染色体分面，横轴是实际碱基坐标。",
    ["x"],
  ),
  r(
    "alluvial",
    "三阶段流向图",
    "关系与集合",
    "保留同一批对象跨三个阶段的完整路径与数量。",
    "three_stage_flows",
    [
      c("stage1", "第一阶段"),
      c("stage2", "第二阶段"),
      c("stage3", "第三阶段"),
      n("value", "路径数量"),
    ],
    ["flowGap", "nodeWidth", "outline"],
    "每行一条完整三阶段路径及正数数量；带宽保守恒，重复路径会合并，不推断因果。",
  ),
  r(
    "chord",
    "加权弦图",
    "关系与集合",
    "以端点弧长和内部带宽表达节点间的无向关系量。",
    "network_edges",
    [c("source", "节点一"), c("target", "节点二"), n("value", "关系量")],
    ["chordGap", "outline"],
    "3–16个节点，正权重、无自环、不重复的无向边；圆弧长度为节点所有关联量之和，不表示方向。",
  ),
  r(
    "waffle",
    "华夫饼比例图",
    "组成",
    "把组成比例分配到等面积网格，用图例显示实际比例。",
    "parts",
    [c("group", "类别"), n("value", "已有汇总量")],
    ["waffleCells", "cellGap", "outline"],
    "网格数按最大余数法分配，可能舍入；小类别可能不足一格，实际比例仍显示在图例。",
  ),
  r(
    "diverging_bar",
    "水平发散条形图",
    "组间比较",
    "围绕零点展示有正有负的已有效应或变化。",
    "ranked_effect",
    [c("term", "条目名称"), n("value", "变化数值")],
    [
      "width",
      "sortDirection",
      "showValues",
      "outline",
      "colorLow",
      "colorHigh",
    ],
    "一行一个唯一条目，按数值排序；保留零基线，不将正负解释为统计显著。",
    ["x"],
  ),
  r(
    "cumulative_waterfall",
    "累计变化瀑布图",
    "组成",
    "按给定次序累计增减量，显示每一步与最终总量。",
    "balance_changes",
    [c("term", "步骤名称"), n("value", "本步增减量")],
    [
      "startValue",
      "width",
      "showValues",
      "outline",
      "colorLow",
      "colorHigh",
      "fillColor",
    ],
    "保留输入行顺序，起始量由参数指定；步骤量与总量单位相同。不同于按效应排序的瀑布图。",
    ["y"],
  ),
  r(
    "paired_difference",
    "配对差值估计图",
    "一致性与诊断",
    "保留每个配对差值，并显示均值差及其t置信区间。",
    "measurement_pair",
    [
      c("subject", "独立个体编号"),
      n("first", "第一条件"),
      n("second", "第二条件"),
    ],
    ["pointSize", "jitter", "outline", "fillColor", "showReference"],
    "差值=第二条件−第一条件；不同配对之间应独立，均值差95% t区间依赖差值的适当分布假设；不自动判定显著性。",
    ["y"],
  ),
  r(
    "hexbin",
    "六边形分箱图",
    "变量关系",
    "以六边形格子的颜色表达二维观测数量，适合大量重叠点。",
    "dense_relationship",
    [n("x", "横轴数值"), n("y", "纵轴数值")],
    ["bins", "cellBorder", "colorLow", "colorHigh"],
    "颜色为网格内计数，非概率密度；零计数网格显示背景，分箱数会影响显示。",
    ["x", "y"],
  ),
];
export const researchRecipes = RESEARCH.map((r) => [
  r.id,
  r.name,
  r.family,
  r.description,
  r.example,
  r.roles,
  r.controls,
]);
export const researchNotes = Object.fromEntries(
  RESEARCH.map((r) => [r.id, r.notes]),
);
export const researchAxes = Object.fromEntries(
  RESEARCH.map((r) => [r.id, r.axes]),
);
const range = (label, min, max, step, def, section = "shape") => ({
  label,
  type: "range",
  min,
  max,
  step,
  default: def,
  section,
});
const choice = (label, options, def, section = "analysis") => ({
  label,
  type: "select",
  options,
  default: def,
  section,
});
const bool = (label, def = true) => ({
  label,
  type: "boolean",
  default: def,
  section: "shape",
});
export const researchParams = {
  clusterMethod: choice(
    "聚类连接方法",
    { complete: "完全连接", average: "平均连接", "ward.D2": "Ward 最小方差" },
    "complete",
  ),
  treeSize: range("聚类树占比", 0.1, 0.4, 0.01, 0.22),
  panelGap: range("分面间距（毫米）", 1, 12, 0.5, 3),
  parallelScale: choice(
    "平行轴缩放",
    { minmax: "各变量0–1缩放", zscore: "各变量标准分数" },
    "minmax",
  ),
  loadingScale: range("载荷箭头展示倍率", 0.2, 2, 0.05, 0.8),
  showCI: bool("显示95%置信带"),
  showCensor: bool("显示删失标记"),
  riskTable: bool("显示风险人数表"),
  riskTicks: range("风险表时间点数", 3, 8, 1, 5),
  angleBins: range("方向分箱数", 4, 36, 2, 12),
  clockwise: bool("顺时针方向"),
  logAbundance: bool("丰度轴使用对数尺度", false),
  rarefactionSteps: range("稀释计算点数", 10, 100, 5, 50, "analysis"),
  chordGap: range("节点圆弧间隙（度）", 1, 8, 0.5, 3),
  waffleCells: choice(
    "比例网格总数",
    { 100: "100格（每格1%）", 400: "400格（每格0.25%）" },
    "100",
    "shape",
  ),
  cellGap: range("网格内部留白", 0, 0.5, 0.02, 0.08),
  startValue: {
    ...range("起始量", -1e9, 1e9, 0.1, 0, "analysis"),
    type: "number",
  },
};

export function researchExample(kind, rand, normal) {
  const round = (n) => +n.toFixed(3);
  let rows, mapping, title, context;
  if (kind === "research_matrix") {
    rows = ["对照", "盐处理", "恢复"].flatMap((group, j) =>
      Array.from({ length: 6 }, (_, i) => {
        const vigor = normal();
        return {
          样本: `${group}${i + 1}`,
          组别: group,
          根长: round(57 - 12 * j + 7 * vigor + normal() * 3),
          叶绿素: round(34 - j * 3 + vigor * 2 + normal()),
          根表面积: round(18 - j * 2 + vigor * 3 + normal()),
          抗氧化活性: round(45 + j * 9 - vigor * 4 + normal() * 5),
        };
      }),
    );
    mapping = {
      subject: "样本",
      group: "组别",
      columns: ["根长", "叶绿素", "根表面积", "抗氧化活性"],
    };
    title = "多指标表型比较";
    context = "模拟18株独立植株的多指标表型，变量单位不同。";
  } else if (kind === "individual_survival") {
    rows = ["处理组", "对照组"].flatMap((group, j) =>
      Array.from({ length: 22 }, (_, i) => {
        const eventTime = -Math.log(Math.max(rand(), 1e-6)) * (j ? 15 : 24),
          censorTime = 9 + rand() * 22;
        return {
          个体: `${j + 1}-${i + 1}`,
          组别: group,
          随访时间: round(Math.max(0.1, Math.min(eventTime, censorTime))),
          事件: eventTime <= censorTime ? 1 : 0,
        };
      }),
    );
    mapping = {
      subject: "个体",
      group: "组别",
      time: "随访时间",
      event: "事件",
    };
    title = "个体随访与事件发生";
    context =
      "模拟独立个体右删失数据，时间单位为天。1表示事件，0表示最后随访时未观察到事件；不是实际临床数据。";
  } else if (kind === "experiment_schedule") {
    rows = [
      ["种子消毒", 0, 0.7, "准备"],
      ["浸种催芽", 0.7, 3.2, "准备"],
      ["幼苗培养", 3.2, 13.8, "培养"],
      ["盐胁迫", 13.8, 19.1, "处理"],
      ["恢复培养", 19.1, 25.4, "处理"],
      ["成像采样", 14.2, 24.6, "测量"],
      ["生化检测", 20.3, 27.8, "测量"],
    ].map(([任务, 开始, 结束, 类型]) => ({ 任务, 开始, 结束, 类型 }));
    mapping = { term: "任务", start: "开始", end: "结束", group: "类型" };
    title = "水稻苗期实验安排";
    context = "模拟实验窗口，横轴单位为开始后的天数，允许任务重叠。";
  } else if (kind === "daily_measurements") {
    rows = Array.from({ length: 160 }, (_, i) => ({
      日期: new Date(Date.UTC(2026, 2, 1 + i)).toISOString().slice(0, 10),
      每日观测: round(18 + 3 * Math.sin(i / 11) + normal() * 2.2),
    })).filter((_, i) => ![5, 17, 26, 71, 103, 122].includes(i));
    mapping = { date: "日期", value: "每日观测" };
    title = "每日环境监测";
    context = "模拟每日汇总观测，故意保留缺测日期；缺测不能当作零。";
  } else if (kind === "root_angles") {
    rows = Array.from({ length: 240 }, () => ({
      方向角: round(((rand() < 0.7 ? 55 : 235) + normal() * 28 + 720) % 360),
    }));
    mapping = { angle: "方向角" };
    title = "侧根方向分布";
    context = "模拟圆周方向角（度），0度为图上方，角度属于方向变量而非线性值。";
  } else if (kind === "community_counts") {
    rows = ["根际样本A", "根际样本B", "根际样本C"].flatMap((group, j) =>
      Array.from({ length: 25 }, (_, i) => ({
        样本: group,
        分类单元: `物种${i + 1}`,
        个体数: Math.max(
          0,
          Math.round((65 + j * 12) * Math.exp(-i / (5 + j * 2)) + normal() * 3),
        ),
      })),
    );
    mapping = { group: "样本", taxon: "分类单元", count: "个体数" };
    title = "根际群落的采样与丰度";
    context =
      "模拟分类单元整数个体计数；不是相对丰度、标准化表达量或真实群落观测。";
  } else if (kind === "genome_regions") {
    rows = ["染色体1", "染色体2", "染色体3"].flatMap((chr, j) =>
      Array.from({ length: 7 }, (_, i) => {
        const start = Math.round(10000 + rand() * 140000);
        return {
          染色体: chr,
          起点: start,
          终点: start + Math.round(2500 + rand() * 21000),
          名称: `区间${j * 7 + i + 1}`,
          类型: i % 3 === 0 ? "候选峰" : "基因",
        };
      }),
    );
    mapping = {
      chromosome: "染色体",
      start: "起点",
      end: "终点",
      label: "名称",
      group: "类型",
    };
    title = "候选基因与峰区间";
    context = "模拟基因组区间，坐标采用0基半开区间，不对应真实基因组版本。";
  } else if (kind === "three_stage_flows") {
    rows = ["对照", "盐处理"].flatMap((a) =>
      ["低响应", "高响应"].flatMap((b) =>
        ["恢复", "未恢复"].map((c) => ({
          初始: a,
          响应: b,
          结局: c,
          数量: Math.round(5 + rand() * 26),
        })),
      ),
    );
    mapping = { stage1: "初始", stage2: "响应", stage3: "结局", value: "数量" };
    title = "表型状态的三阶段变化";
    context = "模拟完整路径汇总计数，一行表示一批对象沿同一条三阶段路径流动。";
  } else if (kind === "balance_changes") {
    rows = [
      ["初始储量", 54.7],
      ["光合输入", 23.8],
      ["呼吸消耗", -18.4],
      ["根系分配", -11.2],
      ["补充输入", 8.6],
      ["渗漏损失", -4.3],
    ].map(([步骤, 变化量]) => ({ 步骤, 变化量 }));
    mapping = { term: "步骤", value: "变化量" };
    title = "物质收支的累计变化";
    context =
      "模拟同单位的顺序收支，第一行从零起始增加初始储量，其后各行是增减量。";
  } else if (kind === "dense_relationship") {
    rows = Array.from({ length: 1800 }, () => {
      const x = normal() * 1.8 + (rand() < 0.3 ? 3 : 0);
      return {
        横坐标: round(x),
        纵坐标: round(0.65 * x + normal() * (0.65 + Math.abs(x) * 0.16)),
      };
    });
    mapping = { x: "横坐标", y: "纵坐标" };
    title = "高密度二维观测";
    context = "模拟1800个相关观测，有不均匀密度与异方差。";
  } else return null;
  return { rows, mapping, title, context };
}

export function configureResearchExample(id, data, params) {
  if (!RESEARCH.some((r) => r.id === id)) return;
  params.legend = [
    "dendrogram",
    "gantt",
    "polar_histogram",
    "paired_difference",
    "cumulative_waterfall",
  ].includes(id)
    ? "none"
    : "right";
  if (
    [
      "scatter_matrix",
      "clustered_heatmap",
      "calendar_heatmap",
      "pca_biplot",
      "alluvial",
      "chord",
    ].includes(id)
  ) {
    params.widthMm = 190;
    params.heightMm = 145;
  }
  if (id === "clustered_heatmap") {
    params.normalization = "row_z";
    params.axisAngle = "90";
  }
  if (id === "scatter_matrix") {
    params.pointSize = 1.3;
    params.fontSize = 9;
    params.legend = "bottom";
  }
  if (id === "pca_biplot") params.heightMm = 100;
  if (id === "parallel_coordinates") {
    params.alpha = 0.45;
    params.pointSize = 1.2;
  }
  if (id === "dendrogram") {
    params.axisAngle = "90";
    params.widthMm = 180;
  }
  if (id === "kaplan_meier") {
    params.heightMm = 145;
    params.legend = "top";
  }
  if (id === "swimmer") {
    data.rows = data.rows.filter((_, i) => i % 3 === 0);
    params.heightMm = 145;
  }
  if (id === "gantt") params.showValues = false;
  if (id === "calendar_heatmap") {
    params.showValues = false;
    params.heightMm = 180;
    params.legend = "bottom";
  }
  if (["hexbin", "calendar_heatmap"].includes(id)) {
    params.colorLow = "#DCE8F1";
    params.colorHigh = "#3F6B4F";
  }
  if (id === "hexbin") params.bins = 24;
  if (id === "genomic_intervals") {
    params.heightMm = 150;
    params.legend = "top";
  }
  if (id === "cumulative_waterfall") {
    params.widthMm = 190;
    params.axisAngle = "45";
  }
  if (id === "diverging_bar") {
    data.rows = data.rows.slice(0, 12);
    params.heightMm = 135;
  }
  if (id === "chord")
    data.rows = data.rows.filter(
      (r) =>
        Number(r.节点一.replace("基因", "")) <= 6 &&
        Number(r.节点二.replace("基因", "")) <= 6,
    );
}
