import { chartNumber } from "./home.mjs";
import { raincloudIds } from "./raincloud.mjs";
import { chartType } from "./chart-types.mjs";
import { variantIds } from "./recipes-v6.mjs";
import { RESEARCH } from "./recipes-v4.mjs";
export const newRecipeIds = new Set([
  ...raincloudIds,
  ...variantIds,
  ...RESEARCH.map((r) => r.id),
]);
const aliases = {
  kaplan_meier: "KM Kaplan Meier 生存 删失 风险人数 随访",
  clustered_heatmap: "cluster heatmap 聚类 热力图 树状",
  dendrogram: "hclust hierarchical tree 聚类 树状图",
  scatter_matrix: "pairs pairplot ggpairs 散点矩阵 两两相关",
  parallel_coordinates: "parallel 平行坐标 多指标",
  pca_biplot: "PCA biplot 双标 载荷 得分",
  polar_histogram: "rose circular histogram 玫瑰 方向 角度 风向",
  rarefaction: "rarefy 稀释 物种 丰富度 多样性",
  rank_abundance: "rank abundance 群落 优势度 均匀度",
  alluvial: "sankey alluvial 桑基 多阶段 河流 流向",
  chord: "circos chord 弦图 关系",
  genomic_intervals: "genome gene track bed 基因轨道 区间 染色体 峰",
  swimmer: "swimmer 泳道 随访 持续时间",
  gantt: "gantt 时间线 实验日程 任务",
  calendar_heatmap: "calendar 日历 每日 时间 热力图",
  paired_difference: "estimation paired difference 配对 差值 估计 效应量",
  cumulative_waterfall: "waterfall 累计 瀑布 收支 增减",
  diverging_bar: "diverging bar 发散 条形 正负",
  waffle: "waffle 华夫饼 网格 比例 百分比",
  hexbin: "hex bin 六边形 蜂窝 二维分箱 密度",
  violin: "violin 小提琴 分布",
  box: "boxplot 箱型 箱线 四分位",
  bar: "bar 柱形 柱状 均值 误差",
  scatter: "scatter 散点 相关",
  heatmap: "heatmap 热力 热图 矩阵",
  volcano: "volcano 火山 差异基因",
  raincloud: "rain cloud raincloud 云雨 雨云 半小提琴 分布",
  raincloud_horizontal:
    "rain cloud raincloud 云雨 雨云 横向 水平 半小提琴 分布",
  grouped_raincloud: "rain cloud raincloud 云雨 雨云 分面 分组 半小提琴 分布",
  upset: "upset 韦恩 venn 集合 交集",
  sankey: "sankey 桑基 流向",
  roc: "receiver operating characteristic ROC 受试者",
  enrichment: "GO KEGG enrichment 富集 气泡",
  survival: "survival 已有 生存概率",
};
export const DATA_SHAPES = {
  all: "所有数据形式",
  matrix: "矩阵与多变量数据",
  events: "个体随访数据",
  intervals: "区间与上下界",
  links: "关系与集合",
  paired: "两个条件的配对值",
  observations: "逐行观测或汇总",
};
export function dataShape(recipe) {
  const roles = new Set(recipe.roles.map((r) => r.id));
  if (roles.has("event")) return "events";
  if (roles.has("columns") || (roles.has("row") && roles.has("column")))
    return "matrix";
  if (roles.has("first") && roles.has("second")) return "paired";
  if (roles.has("start") || roles.has("lower")) return "intervals";
  if (roles.has("source") || roles.has("stage1") || roles.has("set"))
    return "links";
  return "observations";
}
export function filterRecipes(
  catalog,
  {
    query = "",
    family = "全部",
    scope = "all",
    shape = "all",
    favorites = [],
    recent = [],
  } = {},
) {
  const words = query
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const result = catalog.filter((r) => {
    if (
      family !== "全部" &&
      chartType(r.id)?.id !== family &&
      r.family !== family
    )
      return false;
    if (scope === "new" && !newRecipeIds.has(r.id)) return false;
    if (scope === "favorites" && !favorites.includes(r.id)) return false;
    if (scope === "recent" && !recent.includes(r.id)) return false;
    if (shape !== "all" && dataShape(r) !== shape) return false;
    const text = [
      chartNumber(r.id),
      r.name,
      r.id.replaceAll("_", " "),
      r.id,
      r.family,
      r.description,
      r.searchText || "",
      ...r.roles.map((r) => r.label),
      aliases[r.id] || "",
    ]
      .join(" ")
      .normalize("NFKC")
      .toLowerCase();
    return words.every((w) => text.includes(w));
  });
  return scope === "recent"
    ? result.sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id))
    : result;
}
export function recentRecipes(previous, id) {
  return [id, ...previous.filter((v) => v !== id)].slice(0, 12);
}
