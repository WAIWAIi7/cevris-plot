const n = (id, label) => ({ id, label, type: "number", required: true });
const c = (id, label) => ({ id, label, type: "category", required: true });
const optionalGroup = { ...c("group", "颜色分组（可选）"), required: false };
const distribution = [c("group", "分组"), n("value", "测量值")];
const xy = [n("x", "横轴数值"), n("y", "纵轴数值"), optionalGroup];
const grid = [
  n("x", "网格横坐标"),
  n("y", "网格纵坐标"),
  n("value", "网格数值"),
];
const composition = [c("group", "类别"), n("value", "已有汇总量")];
const matrix = [
  { id: "columns", label: "数值特征列", type: "multi", required: true },
];
const recipe = (
  id,
  name,
  family,
  description,
  example,
  roles,
  controls,
  notes,
  axes = ["x", "y"],
) => ({ id, name, family, description, example, roles, controls, notes, axes });
export const PACK = [
  recipe(
    "ridgeline",
    "山脊密度图",
    "数据分布",
    "沿共同数值轴比较多个组的密度。",
    "phenotype",
    distribution,
    ["bandwidth", "ridgeHeight", "outline"],
    "每组至少3个非恒定观测；密度各自归一，山峰高度不代表样本量。",
    ["x"],
  ),
  recipe(
    "beeswarm",
    "蜂群散点图",
    "数据分布",
    "保留每个观测，并用确定性的横向避让减少重叠。",
    "phenotype",
    distribution,
    ["pointSize", "swarmSpread", "outline"],
    "仅横向避让，纵向原始数值不变；密集大样本仍可能重叠。",
    ["y"],
  ),
  recipe(
    "histogram_density",
    "直方与密度叠加图",
    "数据分布",
    "用一致的密度单位叠加分箱和核密度曲线。",
    "phenotype",
    [n("value", "测量值")],
    ["bins", "bandwidth", "fillColor", "outline"],
    "直方图纵轴为概率密度，不是频数；默认使用全部观测。",
  ),
  recipe(
    "frequency_polygon",
    "频数折线图",
    "数据分布",
    "用共同分箱比较各组频数。",
    "phenotype",
    distribution,
    ["bins", "showPoints", "pointSize"],
    "各组使用相同分箱；频数受到样本量影响。",
  ),
  recipe(
    "dotplot",
    "堆叠点图",
    "数据分布",
    "按共同数值分箱堆叠点，每个点对应一个观测。",
    "phenotype",
    [n("value", "测量值")],
    ["bins", "pointSize", "fillColor", "outline"],
    "点的横位置为分箱中心；原始精确值保留在数据表。",
  ),
  recipe(
    "density2d",
    "二维密度等高线",
    "变量关系",
    "用核密度等高线呈现二维观测集中区域。",
    "relationship",
    xy,
    ["contourBins", "bandwidth", "showPoints", "pointSize"],
    "每组至少6个样本且两个方向均有变异；等高线是密度估计，非置信区域。",
  ),
  recipe(
    "bin2d",
    "二维分箱热图",
    "变量关系",
    "用颜色编码二维网格内的观测数量。",
    "relationship",
    [n("x", "横轴数值"), n("y", "纵轴数值")],
    ["bins", "colorLow", "colorHigh"],
    "每个网格显示计数，不是平滑密度；零计数格显示背景。",
  ),
  recipe(
    "contour",
    "数值等高线图",
    "空间与场",
    "对完整规则网格绘制等值线。",
    "surface_grid",
    grid,
    ["contourBins", "colorLow", "colorHigh"],
    "需要完整等距矩形网格；不对缺测点做插值。",
  ),
  recipe(
    "filled_contour",
    "填色等高线图",
    "空间与场",
    "对完整规则网格绘制离散数值色带。",
    "surface_grid",
    grid,
    ["contourBins", "colorLow", "colorHigh"],
    "色带对应数值区间；需要完整等距网格。",
  ),
  recipe(
    "stacked_area",
    "堆叠面积图",
    "组成",
    "沿时间展示可相加的各组成量与总量。",
    "composition_time",
    xy,
    ["outline"],
    "各系列需有相同时间点、非负且同单位数值；仅适合可相加的组成。",
  ),
  recipe(
    "streamgraph",
    "河流图",
    "组成",
    "围绕居中基线展示随时间变化的组成量。",
    "composition_time",
    xy,
    ["outline"],
    "总厚度表示总量；居中基线不是零线，不适合比较绝对位置。",
  ),
  recipe(
    "slope",
    "斜率图",
    "时间与配对",
    "连接各条目两个条件的已知数值。",
    "measurement_pair",
    [c("term", "条目"), n("first", "第一条件"), n("second", "第二条件")],
    ["showPoints", "pointSize", "fillColor"],
    "输入同单位的两个条件，一行一个条目；不执行配对检验。",
    ["y"],
  ),
  recipe(
    "bump",
    "排名变化图",
    "时间与配对",
    "连接各系列在多个时间点的已有排名。",
    "rank_time",
    xy,
    ["showPoints", "pointSize"],
    "输入已有的正整数排名；排名1位于上方，不由图形重新排名。",
    ["x"],
  ),
  recipe(
    "connected_scatter",
    "连线散点图",
    "时间与配对",
    "按序列字段连接二维轨迹，保留运动方向。",
    "trajectory",
    [...xy, n("sequence", "连接次序")],
    ["showPoints", "pointSize"],
    "按次序连接，不按横坐标排序；每组次序必须唯一。",
  ),
  recipe(
    "radar",
    "雷达图",
    "多变量",
    "在共同尺度上展示各组的多项指标轮廓。",
    "radar_values",
    [c("term", "指标"), n("value", "共同尺度数值"), c("group", "比较组")],
    ["radarMax", "bandAlpha", "showPoints", "pointSize"],
    "输入已转到共同尺度的非负指标；不自动标准化，不以多边形面积比较优劣。",
    [],
  ),
  recipe(
    "pie",
    "饼图",
    "组成",
    "用扇区表示一个总体的组成比例。",
    "parts",
    composition,
    ["outline", "showValues"],
    "类别必须互斥且构成同一总体；细微差异优先用柱状图。",
    [],
  ),
  recipe(
    "donut",
    "环形图",
    "组成",
    "用环形扇区表示一个总体的组成比例。",
    "parts",
    composition,
    ["outline", "showValues", "holeSize"],
    "类别互斥且同单位；总量为所有输入值之和。",
    [],
  ),
  recipe(
    "treemap",
    "矩形树图",
    "组成",
    "以矩形面积展示已汇总类别的相对数量。",
    "parts",
    composition,
    ["outline", "showValues"],
    "矩形面积与正数值成正比；当前是单层类别，不含嵌套层级。",
    [],
  ),
  recipe(
    "mosaic",
    "马赛克列联图",
    "组成",
    "以矩形面积表示两类变量的联合频数。",
    "contingency",
    [c("group", "第一分类"), c("series", "第二分类"), n("value", "频数")],
    ["outline"],
    "宽度按第一分类总数，内部高度按条件比例；只展示频数，不执行独立性检验。",
    [],
  ),
  recipe(
    "sankey",
    "双阶段桑基图",
    "关系与集合",
    "用流带宽度展示来源到去向的已有流量。",
    "flows",
    [c("source", "来源"), c("target", "去向"), n("value", "流量")],
    ["flowGap", "nodeWidth", "outline", "colorHigh"],
    "支持两个阶段的非负流量；不从相关性推断流向或因果。",
    [],
  ),
  recipe(
    "network",
    "环形网络图",
    "关系与集合",
    "固定圆周布局展示已有边及权重。",
    "network_edges",
    [c("source", "节点一"), c("target", "节点二"), n("value", "正权重")],
    ["pointSize", "edgeScale", "fillColor"],
    "展示无向网络；位置是布局，不是生物学距离。节点最多40个。",
    [],
  ),
  recipe(
    "funnel",
    "漏斗图",
    "模型评估",
    "按已有标准误展示效应估计及参考漏斗。",
    "effects_se",
    [n("estimate", "效应估计"), n("se", "标准误")],
    ["pointSize", "fillColor", "outline", "referenceLine", "showReference"],
    "参考线由你指定，漏斗为参考值 ± 1.96 × 标准误；不自动合并效应或判断发表偏倚。",
  ),
  recipe(
    "calibration",
    "校准曲线",
    "模型评估",
    "比较已有预测概率分箱与观察到的比例。",
    "calibration_bins",
    [n("x", "平均预测概率"), n("y", "实际发生比例"), optionalGroup],
    ["pointSize", "showReference"],
    "输入已有分箱结果；不拟合校准模型，不能单凭此图判断外部有效性。",
  ),
  recipe(
    "residual",
    "残差诊断图",
    "模型评估",
    "显示已有拟合值与残差的关系。",
    "residuals",
    [n("x", "拟合值"), n("y", "残差"), optionalGroup],
    ["pointSize", "outline", "showReference"],
    "仅展示你提供的模型诊断量，不重新拟合模型。",
  ),
  recipe(
    "ternary",
    "三元组成图",
    "组成",
    "在三角形内显示三个组成分量的相对比例。",
    "ternary_values",
    [n("a", "组成一"), n("b", "组成二"), n("c", "组成三"), optionalGroup],
    ["pointSize", "outline"],
    "每行三个非负值会除以该行总和；三项必须构成完整且同单位的组成。",
    [],
  ),
  recipe(
    "oncoprint",
    "分类变异矩阵",
    "矩阵与组学",
    "以离散颜色展示样本与特征的已有分类状态。",
    "alterations",
    [c("row", "基因或特征"), c("column", "样本"), c("group", "分类状态")],
    ["cellBorder"],
    "每个样本与特征一条分类记录；未检测必须明确记录，未填写的格子不等于野生型。",
    [],
  ),
  recipe(
    "upset",
    "集合交集图",
    "关系与集合",
    "用交集柱和成员点阵显示集合的精确交集计数。",
    "set_membership",
    [c("element", "元素编号"), c("set", "集合名称")],
    ["topIntersections", "pointSize", "fillColor"],
    "每行表示某元素属于某集合；柱为互斥的精确组合，非所有子集的包含式交集。最多8个集合。",
    [],
  ),
  recipe(
    "scree",
    "主成分碎石图",
    "多变量",
    "由数值矩阵计算各主成分解释的方差比例。",
    "multivariate",
    matrix,
    ["scalePca", "showPoints", "pointSize", "fillColor"],
    "每行一个独立样本；选择是否统一量纲，图中保留计算设置。",
    ["y"],
  ),
  recipe(
    "loading",
    "主成分载荷图",
    "多变量",
    "显示前两主成分中的变量载荷方向。",
    "multivariate",
    matrix,
    ["scalePca", "fillColor"],
    "箭头为 prcomp 的旋转载荷，非相关系数；方向符号可能整体翻转。",
  ),
  recipe(
    "lorenz",
    "洛伦兹曲线",
    "数据分布",
    "将非负数值排序后显示累计份额。",
    "phenotype",
    [n("value", "非负数值"), optionalGroup],
    ["showReference", "showPoints", "pointSize"],
    "比较组内累计份额；不自动计算或解释基尼系数。",
  ),
];
export const packRecipes = PACK.map((r) => [
  r.id,
  r.name,
  r.family,
  r.description,
  r.example,
  r.roles,
  r.controls,
]);
export const packNotes = Object.fromEntries(PACK.map((r) => [r.id, r.notes]));
export const packAxes = Object.fromEntries(PACK.map((r) => [r.id, r.axes]));
const range = (label, min, max, step, def) => ({
  label,
  type: "range",
  min,
  max,
  step,
  default: def,
  section: "shape",
});
export const packParams = {
  ridgeHeight: range("山脊相对高度", 0.2, 2, 0.05, 0.8),
  swarmSpread: range("蜂群横向宽度", 0.05, 0.45, 0.01, 0.25),
  contourBins: range("等高线级数", 3, 20, 1, 8),
  radarMax: {
    ...range("共同尺度上限", 0.01, 100000, 0.1, 100),
    type: "number",
    section: "analysis",
  },
  holeSize: range("环形空心比例", 0.1, 0.85, 0.05, 0.55),
  flowGap: range("节点间隙比例", 0.01, 0.12, 0.01, 0.04),
  nodeWidth: range("节点宽度", 0.03, 0.2, 0.01, 0.08),
  edgeScale: range("边权重线宽倍率", 0.2, 3, 0.1, 1),
  topIntersections: range("显示交集组合数", 3, 20, 1, 12),
  showValues: {
    label: "显示数值标签",
    type: "boolean",
    default: true,
    section: "shape",
  },
};
export function packExample(kind, rand, normal) {
  const round = (n) => +n.toFixed(4);
  let rows, mapping, title, context;
  if (kind === "surface_grid") {
    const axis = Array.from({ length: 19 }, (_, i) => round(-3 + i / 3));
    rows = axis.flatMap((x) =>
      axis.map((y) => ({
        横坐标: x,
        纵坐标: y,
        响应: round(
          2.7 * Math.exp(-((x - 0.6) ** 2 + (y + 0.4) ** 2) / 2) +
            0.8 * Math.exp(-((x + 1.8) ** 2 + (y - 1.5) ** 2)) +
            0.15 * Math.sin(x * 2 + y),
        ),
      })),
    );
    mapping = { x: "横坐标", y: "纵坐标", value: "响应" };
    title = "空间响应场";
    context = "模拟规则网格的连续响应，不是真实空间测量。";
  } else if (kind === "composition_time") {
    rows = [0, 1.5, 4, 7, 11, 16].flatMap((t) =>
      ["根", "茎", "叶"].map((g, j) => ({
        时间: t,
        器官: g,
        生物量: round(3 + j * 1.7 + t * (0.4 + j * 0.13) + normal() * 0.5),
      })),
    );
    mapping = { x: "时间", y: "生物量", group: "器官" };
    title = "器官生物量的时间变化";
    context = "模拟各时间点已汇总的器官干重，单位一致且可相加。";
  } else if (kind === "rank_time") {
    const ranks = [
      [2, 1, 4, 3],
      [1, 3, 4, 2],
      [2, 4, 3, 1],
      [3, 2, 1, 4],
      [2, 1, 3, 4],
    ];
    rows = ranks.flatMap((a, i) =>
      a.map((v, j) => ({
        时间: [0, 3, 8, 13, 21][i],
        排名: v,
        材料: ["材料甲", "材料乙", "材料丙", "材料丁"][j],
      })),
    );
    mapping = { x: "时间", y: "排名", group: "材料" };
    title = "不同材料的排名变化";
    context = "模拟已有排名，数值不是原始性状得分。";
  } else if (kind === "trajectory") {
    rows = ["植株甲", "植株乙"].flatMap((g, j) =>
      Array.from({ length: 18 }, (_, i) => ({
        横坐标: round(
          Math.cos(i * 0.24 + j) * (0.3 + i * 0.2) + normal() * 0.05,
        ),
        纵坐标: round(
          Math.sin(i * 0.24 + j) * (0.3 + i * 0.2) + normal() * 0.05,
        ),
        时间: i * 2,
        个体: g,
      })),
    );
    mapping = { x: "横坐标", y: "纵坐标", sequence: "时间", group: "个体" };
    title = "根尖二维轨迹";
    context = "模拟根尖位置，按采样时间连接。";
  } else if (kind === "radar_values") {
    rows = ["对照", "材料甲", "材料乙"].flatMap((g, j) =>
      ["根长", "根表面积", "抗氧化", "叶绿素", "生物量"].map((t, k) => ({
        材料: g,
        指标: t,
        标准得分: round(43 + rand() * 35 + Math.sin(j + k) * 9),
      })),
    );
    mapping = { term: "指标", value: "标准得分", group: "材料" };
    title = "材料的共同尺度指标";
    context = "模拟已转换到0–100共同尺度的指标，无自动标准化。";
  } else if (kind === "parts") {
    rows = ["糖类", "有机酸", "氨基酸", "脂类", "其他"].map((g) => ({
      类别: g,
      丰度: round(5 + Math.exp(rand() * 3)),
    }));
    mapping = { group: "类别", value: "丰度" };
    title = "代谢物类别组成";
    context = "模拟同单位且互斥的已汇总类别。";
  } else if (kind === "contingency") {
    rows = ["对照", "低盐", "高盐"].flatMap((g) =>
      ["正常", "轻度", "重度"].map((s) => ({
        处理: g,
        状态: s,
        数量: Math.round(4 + rand() * 27),
      })),
    );
    mapping = { group: "处理", series: "状态", value: "数量" };
    title = "处理与表型状态";
    context = "模拟互斥分类频数，不执行独立性检验。";
  } else if (kind === "flows") {
    rows = ["根系", "茎部", "叶片"].flatMap((g) =>
      ["可溶组分", "结构组分", "储存组分"].map((t) => ({
        来源: g,
        去向: t,
        流量: round(3 + rand() * 17),
      })),
    );
    mapping = { source: "来源", target: "去向", value: "流量" };
    title = "已有物质流量概览";
    context = "模拟双阶段的正流量汇总。";
  } else if (kind === "network_edges") {
    rows = Array.from({ length: 9 }, (_, i) =>
      [1, 3].map((d) => ({
        节点一: "基因" + (i + 1),
        节点二: "基因" + (((i + d) % 9) + 1),
        权重: round(0.2 + rand() * 0.8),
      })),
    ).flat();
    mapping = { source: "节点一", target: "节点二", value: "权重" };
    title = "已有基因关联网络";
    context = "模拟无向加权边；网络不代表已验证生物学关系。";
  } else if (kind === "effects_se") {
    rows = Array.from({ length: 26 }, (_, i) => {
      const se = 0.07 + rand() * 0.35;
      return {
        研究: "研究" + (i + 1),
        效应: round(normal() * se),
        标准误: round(se),
      };
    });
    mapping = { estimate: "效应", se: "标准误" };
    title = "已有研究效应与标准误";
    context = "模拟独立研究的已有结果，不执行元分析。";
  } else if (kind === "calibration_bins") {
    rows = ["模型甲", "模型乙"].flatMap((g, j) =>
      Array.from({ length: 9 }, (_, i) => {
        const x = 0.04 + i * 0.105;
        return {
          模型: g,
          预测概率: round(x),
          发生比例: round(
            Math.min(
              0.98,
              Math.max(0.01, x + normal() * 0.035 + j * 0.12 * Math.sin(x * 4)),
            ),
          ),
        };
      }),
    );
    mapping = { group: "模型", x: "预测概率", y: "发生比例" };
    title = "已有分箱的校准结果";
    context = "模拟已有分箱结果，不含模型拟合和置信区间。";
  } else if (kind === "residuals") {
    rows = Array.from({ length: 85 }, () => {
      const x = 20 + rand() * 45;
      return { 拟合值: round(x), 残差: round(normal() * (1 + x * 0.04)) };
    });
    mapping = { x: "拟合值", y: "残差" };
    title = "模型残差与拟合值";
    context = "模拟已有模型诊断输出，非自动模型拟合。";
  } else if (kind === "ternary_values") {
    rows = ["对照", "盐处理"].flatMap((g, j) =>
      Array.from({ length: 25 }, () => ({
        处理: g,
        根: round(10 + rand() * 25 + j * 5),
        茎: round(20 + rand() * 25),
        叶: round(25 + rand() * 35 - j * 3),
      })),
    );
    mapping = { group: "处理", a: "根", b: "茎", c: "叶" };
    title = "根茎叶三元组成";
    context = "模拟三个器官同单位干重，绘图时按行归一。";
  } else if (kind === "alterations") {
    rows = Array.from({ length: 7 }, (_, i) =>
      Array.from({ length: 14 }, (_, j) => ({
        基因: "基因" + (i + 1),
        样本: "样本" + String(j + 1).padStart(2, "0"),
        状态: rand() < 0.68 ? "未检出" : rand() < 0.6 ? "错义变异" : "拷贝变化",
      })),
    ).flat();
    mapping = { row: "基因", column: "样本", group: "状态" };
    title = "样本分类状态矩阵";
    context = "模拟已有的分类结果，未检出已明确填写。";
  } else if (kind === "set_membership") {
    rows = [];
    for (let i = 0; i < 96; i++) {
      const memberships = ["根响应", "叶响应", "盐响应", "干旱响应"].filter(
        () => rand() < 0.43,
      );
      if (!memberships.length) memberships.push("根响应");
      for (const s of memberships)
        rows.push({ 基因: "基因" + (i + 1), 集合: s });
    }
    mapping = { element: "基因", set: "集合" };
    title = "响应基因集合的精确交集";
    context = "模拟集合成员表，每个元素可属于多个集合。";
  } else return null;
  return { rows, mapping, title, context };
}
