import { PACK } from "../shared/recipes-v3.mjs";
export function validatePack(p, rows, issues, warnings) {
  const { recipeId: id, mapping: m, params: s } = p;
  if (!PACK.some((r) => r.id === id)) return;
  const nums = (k) => rows.map((r) => Number(r[m[k]]));
  const values = (k) => rows.map((r) => String(r[m[k]]));
  const unique = (...keys) =>
    new Set(rows.map((r) => JSON.stringify(keys.map((k) => r[m[k]])))).size ===
    rows.length;
  const groups = m.group
    ? [...new Set(values("group"))].map((g) =>
        rows.filter((r) => String(r[m.group]) === g),
      )
    : [rows];
  if (
    ["ridgeline", "histogram_density"].includes(id) &&
    groups.some(
      (a) => a.length < 3 || new Set(a.map((r) => Number(r[m.value]))).size < 2,
    )
  )
    issues.push("密度计算需要每组至少3个非恒定数值");
  if (
    ["frequency_polygon", "dotplot"].includes(id) &&
    new Set(nums("value")).size < 2
  )
    issues.push("分箱需要有变异的数值");
  if (id === "beeswarm" && rows.length > 1500)
    issues.push("蜂群图最多1500个点；大样本建议分组散点或密度图");
  if (
    id === "density2d" &&
    groups.some(
      (a) =>
        a.length < 6 ||
        ["x", "y"].some((k) => new Set(a.map((r) => Number(r[m[k]]))).size < 3),
    )
  )
    issues.push("二维密度每组需至少6个观测，两个方向各至少3个不同数值");
  if (id === "bin2d" && ["x", "y"].some((k) => new Set(nums(k)).size < 2))
    issues.push("二维分箱的两个方向均需要有变异");
  if (["contour", "filled_contour"].includes(id)) {
    const xs = [...new Set(nums("x"))].sort((a, b) => a - b),
      ys = [...new Set(nums("y"))].sort((a, b) => a - b);
    if (
      !unique("x", "y") ||
      xs.length * ys.length !== rows.length ||
      xs.length < 3 ||
      ys.length < 3
    )
      issues.push("等高线需要至少3×3的完整规则网格，位置不可重复");
    if (
      [xs, ys].some((a) =>
        a
          .slice(2)
          .some(
            (v, i) =>
              Math.abs(v - a[i + 1] - (a[1] - a[0])) >
              Math.max(1, Math.abs(a[1] - a[0])) * 0.001,
          ),
      )
    )
      issues.push("网格每个方向需等距；请先明确完成插值，不自动补点");
    if (new Set(nums("value")).size < 2) issues.push("等高线数值不能全部相同");
  }
  if (["stacked_area", "streamgraph"].includes(id)) {
    if (nums("y").some((v) => v < 0)) issues.push("组成量不能为负数");
    const all = new Set(nums("x"));
    if (
      !unique("group", "x") ||
      groups.some(
        (a) => new Set(a.map((r) => Number(r[m.x]))).size !== all.size,
      ) ||
      all.size < 2
    )
      issues.push("每个系列须提供相同的时间点，每个位置一条记录");
  }
  if (id === "connected_scatter" && !unique("group", "sequence"))
    issues.push("同一系列的连接次序不可重复");
  if (
    id === "bump" &&
    (nums("y").some((v) => v < 1 || !Number.isInteger(v)) ||
      !unique("group", "x"))
  )
    issues.push("排名应为正整数，每个系列时间点唯一");
  if (id === "slope" && (!unique("term") || m.first === m.second))
    issues.push("斜率图每个条目一行，并选择两个不同测量列");
  if (id === "radar") {
    const terms = new Set(values("term"));
    if (
      terms.size < 3 ||
      terms.size > 12 ||
      !unique("group", "term") ||
      groups.some((a) => a.length !== terms.size)
    )
      issues.push("雷达图需3–12个指标，每组指标一致且每个组合唯一");
    if (nums("value").some((v) => v < 0 || v > s.radarMax))
      issues.push("指标需在0和共同尺度上限之间；请先说明标准化方法");
  }
  if (["pie", "donut", "treemap", "mosaic", "sankey", "lorenz"].includes(id)) {
    if (
      nums("value").some((v) => v < 0) ||
      nums("value").reduce((a, b) => a + b, 0) <= 0
    )
      issues.push("组成或份额数值须非负且总量大于0");
  }
  if (
    ["pie", "donut", "treemap"].includes(id) &&
    (!unique("group") || rows.length > 20 || nums("value").some((v) => v <= 0))
  )
    issues.push("每个类别一条正数汇总记录，最多20类");
  if (
    id === "mosaic" &&
    (nums("value").some((v) => !Number.isInteger(v)) ||
      !unique("group", "series"))
  )
    issues.push("列联频数应为整数且每个分类组合唯一");
  if (id === "sankey") {
    const count = Math.max(
      new Set(values("source")).size,
      new Set(values("target")).size,
    );
    if (count > 15 || s.flowGap * (count - 1) >= 0.8)
      issues.push("桑基图每侧最多15个节点；请减小节点间隙");
  }
  if (id === "network") {
    const nodes = new Set([...values("source"), ...values("target")]);
    const edges = rows.map((r) =>
      [String(r[m.source]), String(r[m.target])].sort().join("\u0000"),
    );
    if (nodes.size > 40 || rows.length > 200 || nodes.size < 3)
      issues.push("网络图需3–40个节点，最多200条边");
    if (
      nums("value").some((v) => v <= 0) ||
      rows.some((r) => r[m.source] === r[m.target]) ||
      new Set(edges).size !== rows.length
    )
      issues.push("当前网络图使用正权重、无自环且不重复的无向边");
  }
  if (id === "funnel" && nums("se").some((v) => v <= 0))
    issues.push("标准误必须大于0");
  if (id === "calibration") {
    if (
      [...nums("x"), ...nums("y")].some((v) => v < 0 || v > 1) ||
      !unique("group", "x")
    )
      issues.push("校准概率须在0–1内，各组分箱预测值唯一");
  }
  if (
    id === "ternary" &&
    rows.some(
      (r) =>
        ["a", "b", "c"].some((k) => Number(r[m[k]]) < 0) ||
        ["a", "b", "c"].reduce((a, k) => a + Number(r[m[k]]), 0) <= 0,
    )
  )
    issues.push("三元分量不得为负，每行总量须大于0");
  if (
    id === "oncoprint" &&
    (!unique("row", "column") ||
      new Set(values("row")).size * new Set(values("column")).size > 40000)
  )
    issues.push("分类矩阵的每个样本特征组合需唯一且不超过40000格");
  if (
    id === "upset" &&
    (!unique("element", "set") ||
      new Set(values("set")).size > 8 ||
      new Set(values("set")).size < 2)
  )
    issues.push("交集图需2–8个集合，每个元素与集合的成员关系只记一行");
  if (["scree", "loading"].includes(id)) {
    if (
      rows.length < 3 ||
      m.columns.some((c) => new Set(rows.map((r) => Number(r[c]))).size < 2)
    )
      issues.push("主成分计算需至少3个样本，各所选数值列不能恒定");
  }
  if (
    id === "lorenz" &&
    groups.some((a) => a.reduce((t, r) => t + Number(r[m.value]), 0) <= 0)
  )
    issues.push("每组总量必须大于0");
  if (
    [
      "stacked_area",
      "histogram_density",
      "frequency_polygon",
      "dotplot",
      "scree",
    ].includes(id) &&
    ((s.yMin ?? 0) > 0 || (s.yMax ?? 0) < 0)
  )
    issues.push("面积、频数或柱形图需保留零基线");
  if (id === "streamgraph" && (s.yMin !== null || s.yMax !== null))
    warnings.push("河流图使用居中基线，裁切会隐藏部分组成厚度");
  warnings.push(PACK.find((r) => r.id === id).notes);
}
