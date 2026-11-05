import { RESEARCH } from "../shared/recipes-v4.mjs";
export function validateResearch(p, rows, issues, warnings) {
  const { recipeId: id, mapping: m, params: s } = p,
    recipe = RESEARCH.find((r) => r.id === id);
  if (!recipe) return;
  warnings.push(recipe.notes);
  if (rows.length < 2) return;
  const nums = (k) => rows.map((r) => Number(r[m[k]])),
    vals = (k) => rows.map((r) => String(r[m[k]])),
    distinct = (k) => new Set(vals(k)).size;
  const unique = (...keys) =>
    new Set(rows.map((r) => JSON.stringify(keys.map((k) => r[m[k]])))).size ===
    rows.length;
  const groups = m.group
    ? [...new Set(vals("group"))].map((k) =>
        rows.filter((r) => String(r[m.group]) === k),
      )
    : [rows];
  if (
    [
      "dendrogram",
      "scatter_matrix",
      "parallel_coordinates",
      "pca_biplot",
    ].includes(id)
  ) {
    const maxColumns =
      id === "scatter_matrix" ? 6 : id === "parallel_coordinates" ? 12 : 30;
    if (m.columns.length > maxColumns)
      issues.push(`该图最多选择${maxColumns}个数值特征`);
    if (
      rows.length < 3 ||
      m.columns.some((c) => new Set(rows.map((r) => Number(r[c]))).size < 2)
    )
      issues.push("至少3个样本，各数值特征不能全部相同");
    if (m.subject && !unique("subject"))
      issues.push("每个样本编号必须唯一，且只占一行");
    const maxRows =
      id === "dendrogram"
        ? 100
        : id === "parallel_coordinates"
          ? 300
          : id === "scatter_matrix"
            ? 1000
            : 5000;
    if (rows.length > maxRows)
      issues.push(`该图最多${maxRows}个样本，请先明确筛选范围`);
    if (m.subject && m.columns.includes(m.subject))
      issues.push("样本编号不可同时用作数值特征");
    if (m.group && m.columns.includes(m.group))
      issues.push("分组列不可同时用作数值特征");
  }
  if (id === "clustered_heatmap") {
    const nr = distinct("row"),
      nc = distinct("column");
    if (
      nr < 2 ||
      nc < 2 ||
      nr > 150 ||
      nc > 100 ||
      nr * nc !== rows.length ||
      !unique("row", "column")
    )
      issues.push(
        "聚类热图需完整且不重复的2–150行、2–100列矩阵，不自动补齐缺失格",
      );
    if (s.normalization === "row_z")
      for (const key of new Set(vals("row"))) {
        const a = rows.filter((r) => String(r[m.row]) === key);
        if (new Set(a.map((r) => Number(r[m.value]))).size < 2) {
          issues.push("存在恒定特征，无法按行标准化；可改用原始数值");
          break;
        }
      }
  }
  if (["kaplan_meier", "swimmer"].includes(id)) {
    if (!unique("subject"))
      issues.push("每个独立个体只能一行；当前不支持重复随访行或延迟入组");
    if (nums("time").some((v) => v <= 0))
      issues.push("随访时间必须大于0，单位保持一致");
    if (nums("event").some((v) => v !== 0 && v !== 1))
      issues.push("事件状态必须明确编码为1（事件）或0（右删失）");
    if (groups.length > 8) issues.push("最多比较8个随访组");
    if (id === "swimmer" && rows.length > 60)
      issues.push("泳道图最多60个个体，请先明确筛选范围");
    if (id === "kaplan_meier" && nums("event").every((v) => v === 0))
      warnings.push("没有观察到事件，生存曲线将保持为1；无法据此推断无风险");
    if ((s.xMin ?? 0) < 0) issues.push("随访时间显示范围不能为负");
  }
  if (["gantt", "genomic_intervals"].includes(id)) {
    if (rows.some((r) => Number(r[m.start]) >= Number(r[m.end])))
      issues.push("每个区间的终点必须大于起点");
    if (id === "gantt" && (!unique("term") || rows.length > 60))
      issues.push("甘特图任务名必须唯一，最多60项");
    if (id === "genomic_intervals") {
      if (
        [...nums("start"), ...nums("end")].some(
          (v) => v < 0 || !Number.isSafeInteger(v),
        )
      )
        issues.push("基因组坐标须为非负安全整数，采用0基半开区间");
      if (distinct("chromosome") > 12 || rows.length > 300)
        issues.push("区间轨道最多12条染色体、300个区间");
    }
  }
  if (id === "calendar_heatmap") {
    const dates = vals("date"),
      parsed = dates.map((v) => new Date(v + "T00:00:00Z"));
    if (
      dates.some(
        (v, i) =>
          !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
          !Number.isFinite(+parsed[i]) ||
          parsed[i].toISOString().slice(0, 10) !== v,
      )
    )
      issues.push("日期必须是有效的YYYY-MM-DD字符串，例如2026-03-18");
    else if ((Math.max(...parsed) - Math.min(...parsed)) / 86400000 > 731)
      issues.push("日历图跨度最多两年");
    if (!unique("date"))
      issues.push("同一天只能一条记录；请先明确每日汇总方式");
  }
  if (id === "polar_histogram" && nums("angle").some((v) => v < 0 || v > 360))
    issues.push("角度必须在0–360度内，不能混用弧度");
  if (["rank_abundance", "rarefaction"].includes(id)) {
    if (nums("count").some((v) => v < 0 || !Number.isSafeInteger(v)))
      issues.push("丰度必须是真实非负整数计数，不能使用相对丰度或标准化值");
    if (!unique("group", "taxon"))
      issues.push("每个样本和分类单元组合只记录一次");
    if (groups.length > 12 || rows.length > 10000)
      issues.push("最多12个群落、10000条计数记录");
    if (
      groups.some((a) => {
        const sum = a.reduce((t, r) => t + Number(r[m.count]), 0);
        return sum <= 0 || sum > 1e9;
      })
    )
      issues.push("每个群落总计数须大于0且不超过10亿");
    if ((s.yMin ?? 0) < 0 || (s.yMax ?? 1) <= 0)
      issues.push("丰度或物种数的显示范围须非负且上限大于0");
    if (
      id === "rank_abundance" &&
      s.logAbundance &&
      s.yMin !== null &&
      s.yMin <= 0
    )
      issues.push("对数丰度轴的最小值须大于0或留空自动");
  }
  if (id === "alluvial") {
    if (nums("value").some((v) => v <= 0))
      issues.push("每条完整路径的数量须大于0");
    const count = Math.max(...["stage1", "stage2", "stage3"].map(distinct));
    if (count > 10 || rows.length > 150 || s.flowGap * (count - 1) >= 0.8)
      issues.push("每阶段最多10种状态、最多150条路径；请减小间隙或汇总路径");
  }
  if (id === "chord") {
    const nodes = new Set([...vals("source"), ...vals("target")]);
    const edges = rows.map((r) =>
      JSON.stringify([String(r[m.source]), String(r[m.target])].sort()),
    );
    if (nodes.size < 3 || nodes.size > 16 || rows.length > 80)
      issues.push("弦图需3–16个节点，最多80条边");
    if (
      nums("value").some((v) => v <= 0) ||
      rows.some((r) => String(r[m.source]) === String(r[m.target])) ||
      new Set(edges).size !== rows.length
    )
      issues.push("弦图使用正权重、无自环且不重复的无向关系");
  }
  if (
    id === "waffle" &&
    (!unique("group") || rows.length > 15 || nums("value").some((v) => v <= 0))
  )
    issues.push("比例网格需每类一条正数汇总记录，最多15类");
  if (["diverging_bar", "cumulative_waterfall"].includes(id)) {
    if (!unique("term") || rows.length > 60)
      issues.push("每条目一条记录且名称唯一，最多60条");
    if (
      id === "cumulative_waterfall" &&
      ["起始量", "最终总量"].some((k) => vals("term").includes(k))
    )
      issues.push("请避免将步骤命名为起始量或最终总量，这两个名称用于总量柱");
    const a = id === "diverging_bar" ? "x" : "y";
    if ((s[a + "Min"] ?? 0) > 0 || (s[a + "Max"] ?? 0) < 0)
      issues.push("条形或累计量图必须保留零基线");
  }
  if (
    id === "paired_difference" &&
    (!unique("subject") || m.first === m.second)
  )
    issues.push("每个独立配对仅一行，并选择两个不同条件列");
  if (id === "hexbin" && ["x", "y"].some((k) => new Set(nums(k)).size < 2))
    issues.push("二维分箱的两个方向都需要有变异");
}
