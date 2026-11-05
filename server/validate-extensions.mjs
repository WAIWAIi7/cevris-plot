import { axisCapabilities, zeroBaseline } from "../shared/extensions.mjs";
export function validateExtensions(p, rows, issues, warnings) {
  const id = p.recipeId,
    m = p.mapping,
    s = p.params;
  const nums = (k) => rows.map((r) => Number(r[m[k]]));
  const subset = () =>
    m.group
      ? [...new Set(rows.map((r) => String(r[m.group])))].map((g) =>
          rows.filter((r) => String(r[m.group]) === g),
        )
      : [rows];
  for (const axis of axisCapabilities(id)) {
    const lo = s[axis + "Min"],
      hi = s[axis + "Max"];
    if (lo !== null && hi !== null && lo >= hi)
      issues.push((axis === "x" ? "横轴" : "纵轴") + "最大值必须大于最小值");
    if (lo !== null || hi !== null)
      warnings.push(
        (axis === "x" ? "横轴" : "纵轴") +
          "使用指定显示范围；范围外的数据仍参与计算",
      );
  }
  if (zeroBaseline.has(id) && ((s.yMin ?? 0) > 0 || (s.yMax ?? 0) < 0))
    issues.push("以长度或面积编码数值的图形需要保留零基线");
  if (
    id === "ma" &&
    s.logX &&
    [s.xMin, s.xMax].some((v) => v !== null && v <= 0)
  )
    issues.push("对数横轴范围必须大于0");
  if (["roc", "precision_recall", "survival"].includes(id)) {
    if (nums("y").some((n) => n < 0 || n > 1))
      issues.push("概率或比率应在0到1之间");
    if (id !== "survival" && nums("x").some((n) => n < 0 || n > 1))
      issues.push("假阳性率或召回率应在0到1之间");
    if (id === "survival" && nums("x").some((n) => n < 0))
      issues.push("随访时间不能为负");
    for (const set of subset()) {
      const a = [...set].sort((r, t) => Number(r[m.x]) - Number(t[m.x]));
      if (
        id === "survival" &&
        a.some((r, i) => i && Number(r[m.y]) > Number(a[i - 1][m.y]))
      )
        issues.push("生存概率不能随时间增加");
      if (
        id === "roc" &&
        a.some((r, i) => i && Number(r[m.y]) < Number(a[i - 1][m.y]))
      )
        issues.push(
          "ROC 真阳性率不能沿假阳性率增大的方向下降；同一横坐标应按阈值路径排列",
        );
    }
    warnings.push("仅展示已有曲线，不重新拟合或计算模型评价指标");
  }
  if (["area", "ribbon", "survival"].includes(id)) {
    if (
      subset().some(
        (a) => new Set(a.map((r) => Number(r[m.x]))).size !== a.length,
      )
    )
      issues.push("每个系列在同一横坐标只能有一条记录");
    if (subset().some((a) => a.length < 2))
      issues.push("每个系列至少需要两个时间点");
  }
  if (id === "area" && nums("y").some((n) => n < 0))
    issues.push("面积图需要非负数值");
  if (id === "ribbon") {
    if (
      rows.some(
        (r) =>
          Number(r[m.lower]) > Number(r[m.y]) ||
          Number(r[m.upper]) < Number(r[m.y]),
      )
    )
      issues.push("估计值必须位于区间上下界内");
    warnings.push("区间来自输入表，请在图注说明其统计含义");
  }
  if (
    ["dumbbell", "waterfall"].includes(id) &&
    new Set(rows.map((r) => String(r[m.term]))).size !== rows.length
  )
    issues.push("每个条目只能有一条记录，请先汇总");
  if (id === "bland_altman") {
    if (rows.length < 3) issues.push("一致性界限至少需要3个独立样本");
    if (new Set(rows.map((r) => String(r[m.subject]))).size !== rows.length)
      issues.push("样本编号重复；重复测量需使用适当的一致性分析方法");
    if (m.first === m.second) issues.push("请选择两种不同方法的测量列");
    warnings.push(
      "一致性界限按独立差值近似正态且变异稳定计算；不能仅凭图形判定方法可互换",
    );
  }
  if (
    id === "mean_interval" &&
    s.errorType !== "none" &&
    subset().some((a) => a.length < 2)
  )
    issues.push("每组至少需要两条观测才能计算误差线");
  if (
    id === "qq" &&
    subset().some(
      (a) => a.length < 3 || new Set(a.map((r) => Number(r[m.value]))).size < 2,
    )
  )
    issues.push("Q–Q 图每组需要至少3条观测且数值不能全部相同");
  if (id === "manhattan") {
    if (nums("position").some((n) => n < 0 || !Number.isInteger(n)))
      issues.push("基因组位置应为非负整数");
    if (nums("p").some((n) => n <= 0 || n > 1))
      issues.push("显著性必须大于0且不超过1");
  }
  if (id === "dot_matrix") {
    if (nums("size").some((n) => n < 0 || n > 1))
      issues.push("表达比例必须在0到1之间，百分数请先除以100");
    if (
      new Set(rows.map((r) => JSON.stringify([r[m.row], r[m.column]]))).size !==
      rows.length
    )
      issues.push("同一基因与细胞群只能有一条汇总记录");
  }
}
