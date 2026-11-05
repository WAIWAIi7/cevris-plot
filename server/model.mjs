import { validateRaincloud } from "../shared/raincloud.mjs";
import { validateVariants } from "./validate-variants.mjs";
import { z } from "zod";
import { PARAMS, defaults, recipeById, PALETTE } from "../shared/catalog.mjs";
import { reconcileColors } from "../shared/colors.mjs";
import { validateExtensions } from "./validate-extensions.mjs";
import { validatePack } from "./validate-pack.mjs";
import { validateResearch } from "./validate-research.mjs";
export { reconcileColors };
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const cell = z.union([
  z.string().max(2000),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);
export const tableSchema = z.object({
  name: z.string().max(200).default("导入数据"),
  columns: z.array(z.string().min(1).max(100)).min(1).max(100),
  rows: z.array(z.record(z.string(), cell)).min(1).max(30000),
  synthetic: z.boolean().default(false),
  seed: z.number().optional(),
  source: z
    .object({
      name: z.string(),
      hash: z.string(),
      sheet: z.string().optional(),
      base64: z.string().max(16000000).optional(),
    })
    .optional(),
});
const paramShape = {};
for (const [key, s] of Object.entries(PARAMS)) {
  let v;
  if (s.type === "boolean") v = z.boolean();
  else if (s.type === "select") v = z.enum(Object.keys(s.options));
  else if (s.type === "color") v = color;
  else if (s.type === "font")
    v = z
      .string()
      .min(1)
      .max(100)
      .regex(/^[\p{L}\p{N} _.-]+$/u);
  else {
    v = z.number().finite().min(s.min).max(s.max);
    if (s.type === "optionalNumber") v = v.nullable();
  }
  paramShape[key] = v.default(s.default);
}
const projectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().uuid().nullable().default(null),
  revision: z.number().int().min(0).default(0),
  name: z.string().min(1).max(150),
  recipeId: z.string().refine((v) => !!recipeById(v), "未知图表"),
  context: z.string().max(5000).default(""),
  data: tableSchema,
  originalData: tableSchema.optional(),
  mapping: z.record(
    z.string(),
    z.union([z.string().max(100), z.array(z.string().max(100)).max(60)]),
  ),
  labels: z.object({
    title: z.string().max(200),
    x: z.string().max(100),
    y: z.string().max(100),
    note: z.string().max(500),
  }),
  params: z.object(paramShape),
  colors: z.record(z.string().max(100), color).default({}),
  paletteId: z.string().max(80).nullable().default(null),
  groupOrder: z
    .array(z.string().max(100))
    .max(100)
    .refine((v) => new Set(v).size === v.length, "分组顺序不可重复")
    .default([]),
  transforms: z
    .array(
      z.object({
        kind: z.string().max(50),
        details: z.string().max(500),
        time: z.string().max(60),
        before: z.number(),
        after: z.number(),
      }),
    )
    .max(100)
    .default([]),
});
export function parseProject(raw) {
  const p = projectSchema.parse(raw);
  p.originalData ??= structuredClone(p.data);
  if (p.data.source) delete p.data.source.base64;
  if (new Set(p.data.columns).size !== p.data.columns.length)
    throw new Error("列名不可重复");
  return p;
}
export const missing = (v) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "");
export const numeric = (v) =>
  !missing(v) && typeof v !== "boolean" && Number.isFinite(Number(v));
export function profile(table) {
  return table.columns.map((name) => {
    const values = table.rows.map((r) => r[name]),
      valid = values.filter((v) => !missing(v));
    return {
      name,
      type: valid.length && valid.every(numeric) ? "number" : "category",
      missing: values.length - valid.length,
      distinct: new Set(valid.map(String)).size,
      preview: valid.slice(0, 4),
    };
  });
}
export function suggestMapping(recipeId, table) {
  const recipe = recipeById(recipeId),
    cols = profile(table),
    used = new Set(),
    map = {};
  const hints = {
    time: /随访时间|生存时间|time|duration/i,
    event: /事件|结局|event|status/i,
    start: /起点|开始|start|begin/i,
    end: /终点|结束|end|stop/i,
    date: /日期|date/i,
    angle: /角|方向|angle|bearing/i,
    taxon: /物种|分类单元|taxon|species|otu|asv/i,
    stage1: /初始|第一阶段|stage.?1/i,
    stage2: /响应|第二阶段|stage.?2/i,
    stage3: /结局|第三阶段|stage.?3/i,
    source: /来源|节点一|source|from/i,
    target: /去向|节点二|target|to$/i,
    sequence: /次序|时间|sequence|time|order/i,
    se: /标准误|stderr|^se$/i,
    element: /基因|元素|element|gene/i,
    set: /集合|set/i,
    a: /^根$|组成一|^a$/i,
    b: /^茎$|组成二|^b$/i,
    c: /^叶$|组成三|^c$/i,
    first: /手工|方法一|method.?a|before|baseline/i,
    second: /图像|方法二|method.?b|after|followup/i,
    chromosome: /染色体|chromosome|chr$/i,
    position: /位置|position|pos$/i,
    group: /处理|组|group|condition|treatment|阶段/i,
    value: /根长|测量|数值|value|length|weight|表达量|干重/i,
    x: /时间|株高|平均表达|假阳性率|召回率|recall|fpr|time|height|basemean|x$/i,
    y: /根长|数值|估计值|真阳性率|精确率|生存概率|tpr|precision|survival|value|length|y$/i,
    effect: /log.?2.?fc|log.?fold|对数倍数|effect/i,
    p: /padj|fdr|p.?value|显著|q.?value/i,
    row: /基因|gene|feature|row/i,
    column: /样本|sample|column/i,
    label: /基因|gene|name|id/i,
    subject: /个体|样本|subject|patient|sample|编号/i,
    series: /品种|器官|series|type|类别/i,
    size: /生物量|表达比例|size|weight|percent/i,
    term: /通路|指标|term|pathway|name/i,
    ratio: /ratio|比例/i,
    count: /count|命中|个体数|计数/i,
    estimate: /estimate|估计/i,
    lower: /lower|下限|lwr/i,
    upper: /upper|上限|upr/i,
  };
  Object.assign(
    hints,
    {
      roc: {
        x: /假阳性率|false.?positive|^fpr$/i,
        y: /真阳性率|true.?positive|sensitivity|^tpr$/i,
        group: /模型|model|组|group/i,
      },
      precision_recall: {
        x: /召回率|recall/i,
        y: /精确率|precision/i,
        group: /模型|model|组|group/i,
      },
      survival: {
        x: /随访|时间|time|duration/i,
        y: /生存概率|survival|probability/i,
      },
      dot_matrix: {
        row: /基因|gene|feature/i,
        column: /细胞群|cluster|cell.?type|组|group/i,
        value: /平均表达|表达|average|expression/i,
        size: /表达比例|比例|fraction|pct|percent/i,
      },
    }[recipeId] || {},
  );
  for (const r of recipe.roles) {
    if (r.type === "multi") {
      map[r.id] = cols
        .filter(
          (c) =>
            c.type === "number" &&
            !used.has(c.name) &&
            !/^(id|sample.?id|subject.?id|样本编号|个体编号|编号)$/i.test(
              c.name,
            ),
        )
        .map((c) => c.name);
      continue;
    }
    const candidates = cols.filter(
      (c) => r.type !== "number" || c.type === "number",
    );
    const match =
      candidates.find((c) => hints[r.id]?.test(c.name) && !used.has(c.name)) ||
      candidates.find(
        (c) =>
          !used.has(c.name) && (r.type === "number" || c.type === "category"),
      );
    if (match && (r.required || hints[r.id]?.test(match.name))) {
      map[r.id] = match.name;
      used.add(match.name);
    }
  }
  return map;
}
export function validateData(p) {
  const recipe = recipeById(p.recipeId),
    issues = [],
    warnings = [],
    roles = recipe.roles;
  const required = [];
  for (const r of roles) {
    const field = p.mapping[r.id];
    if (r.type === "multi") {
      if (!Array.isArray(field) || field.length < 2)
        issues.push(r.label + "：至少选择两列");
      else if (new Set(field).size !== field.length)
        issues.push("数值列不能重复选择");
      else
        for (const f of field) {
          if (!p.data.columns.includes(f)) issues.push("找不到列：" + f);
          else required.push({ name: f, type: "number" });
        }
    } else if (!field) {
      if (r.required) issues.push("请选择" + r.label);
    } else if (typeof field !== "string" || !p.data.columns.includes(field))
      issues.push("找不到列：" + field);
    else required.push({ name: field, type: r.type });
  }
  if (issues.length)
    return {
      ok: false,
      issues,
      warnings,
      inputRows: p.data.rows.length,
      usedRows: 0,
    };
  const bad = new Set(),
    invalid = new Set();
  p.data.rows.forEach((row, i) => {
    for (const r of required) {
      if (missing(row[r.name])) bad.add(i);
      else if (r.type === "number" && !numeric(row[r.name])) invalid.add(i);
    }
  });
  if (invalid.size)
    issues.push("有" + invalid.size + "行包含非数值，请检查所选测量列");
  if (bad.size) {
    if (p.params.omitMissing)
      warnings.push("本次绘图排除" + bad.size + "行缺失值，原始数据仍保留");
    else
      issues.push("有" + bad.size + "行缺失值；请补全或明确勾选“排除缺失行”");
  }
  const rows = p.data.rows.filter((r, i) => !bad.has(i) && !invalid.has(i));
  if (rows.length < 2) issues.push("至少需要两条有效观测");
  const values = (key) => rows.map((r) => r[p.mapping[key]]),
    nums = (key) => values(key).map(Number);
  const groups = p.mapping.group
    ? [...new Set(values("group").map(String))]
    : [];
  if (groups.length > 60) issues.push("分组超过60个，请筛选后绘图");
  if (["violin", "density"].includes(p.recipeId)) {
    const counts = new Map();
    for (const r of rows) {
      const key = p.mapping.group ? String(r[p.mapping.group]) : "全部";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    if ([...counts.values()].some((n) => n < 3))
      issues.push("密度估计每组至少需要3条有效观测，可改用分组散点图");
    const byGroup = new Map();
    for (const row of rows) {
      const key = p.mapping.group ? String(row[p.mapping.group]) : "All";
      if (!byGroup.has(key)) byGroup.set(key, new Set());
      byGroup.get(key).add(Number(row[p.mapping.value]));
    }
    if ([...byGroup.values()].some((values) => values.size < 2))
      issues.push(
        "某个分组的测量值完全相同，无法估计密度，可改用箱线图或散点图",
      );
  }
  const uniquePairs = (a, b) =>
    new Set(rows.map((r) => JSON.stringify([r[p.mapping[a]], r[p.mapping[b]]])))
      .size === rows.length;
  if (p.recipeId === "paired" && !uniquePairs("subject", "group"))
    issues.push("同一个体在同一条件下有多条记录，请先整理技术重复");
  if (p.recipeId === "line" && !uniquePairs("group", "x"))
    issues.push("每组存在重复横坐标，请先汇总后绘制折线");
  if (p.recipeId === "heatmap" && !uniquePairs("row", "column"))
    issues.push("同一行列组合有重复记录，请先汇总");
  if (
    ["volcano", "enrichment"].includes(p.recipeId) &&
    nums("p").some((n) => n <= 0 || n > 1)
  )
    issues.push("显著性必须大于0且不超过1；零值请回到分析结果确认精度");
  if (
    ["stacked_bar", "percent_bar"].includes(p.recipeId) &&
    nums("value").some((n) => n < 0)
  )
    issues.push("组成数值不能为负");
  if (
    p.recipeId === "percent_bar" &&
    groups.some(
      (g) =>
        rows
          .filter((r) => String(r[p.mapping.group]) === g)
          .reduce((a, r) => a + Number(r[p.mapping.value]), 0) <= 0,
    )
  )
    issues.push("百分比图每组总量必须大于0");
  if (p.recipeId === "bubble" && nums("size").some((n) => n < 0))
    issues.push("气泡大小不能为负数");
  if (p.recipeId === "ma" && p.params.logX && nums("x").some((n) => n <= 0))
    issues.push("对数横轴需要大于0的平均表达量");
  if (
    p.recipeId === "enrichment" &&
    (nums("count").some((n) => n <= 0) ||
      nums("ratio").some((n) => n < 0 || n > 1))
  )
    issues.push("富集比例应在0到1之间，命中数应大于0");
  if (
    p.recipeId === "forest" &&
    rows.some(
      (r) =>
        Number(r[p.mapping.lower]) > Number(r[p.mapping.estimate]) ||
        Number(r[p.mapping.upper]) < Number(r[p.mapping.estimate]),
    )
  )
    issues.push("估计值必须位于所提供的上下区间内");
  if (
    ["pca", "correlation"].includes(p.recipeId) &&
    Array.isArray(p.mapping.columns)
  ) {
    if (rows.length < 3) issues.push("矩阵计算至少需要3个完整样本");
    if (
      p.mapping.columns.some(
        (c) => new Set(rows.map((r) => Number(r[c]))).size < 2,
      )
    )
      issues.push("数值列含常数列，请取消选择该列");
  }
  if (p.recipeId === "volcano" && p.params.pKind === "raw")
    warnings.push("当前使用原始显著性，阈值未校正多重比较");
  validateExtensions(p, rows, issues, warnings);
  validatePack(p, rows, issues, warnings);
  validateResearch(p, rows, issues, warnings);
  validateVariants(p, rows, issues, warnings);
  validateRaincloud(p, rows, issues, warnings);
  if (p.data.synthetic) warnings.push("当前使用模拟数据，不可作为真实实验结果");
  return {
    ok: issues.length === 0,
    issues,
    warnings,
    inputRows: p.data.rows.length,
    usedRows: rows.length,
    groups,
  };
}
export function transform(p, action) {
  const next = structuredClone(p),
    before = p.data.rows.length;
  if (action.kind === "wideToLong") {
    const { idColumn, valueColumns } = action;
    if (
      !p.data.columns.includes(idColumn) ||
      !Array.isArray(valueColumns) ||
      !valueColumns.length ||
      valueColumns.some((c) => c === idColumn || !p.data.columns.includes(c))
    )
      throw new Error("请选择行名称列和有效数值列");
    const rows = p.data.rows.flatMap((r) =>
      valueColumns.map((c) => ({
        行名称: r[idColumn],
        列名称: c,
        数值: r[c] ?? null,
      })),
    );
    if (rows.length > 30000)
      throw new Error("展开后超过30000行，请减少选中的列");
    next.data = { ...p.data, columns: ["行名称", "列名称", "数值"], rows };
    next.mapping =
      p.recipeId === "heatmap"
        ? { row: "行名称", column: "列名称", value: "数值" }
        : { group: "列名称", value: "数值" };
  } else if (action.kind === "filter") {
    if (!p.data.columns.includes(action.column))
      throw new Error("筛选列不存在");
    next.data.rows = p.data.rows.filter(
      (r) => String(r[action.column]) === String(action.equals),
    );
    if (!next.data.rows.length) throw new Error("筛选后没有数据");
  } else if (action.kind === "reset") {
    next.data = structuredClone(p.originalData);
    next.mapping = suggestMapping(p.recipeId, next.data);
  } else throw new Error("不支持的整理操作");
  next.transforms.push({
    kind: action.kind,
    details: JSON.stringify(action),
    time: new Date().toISOString(),
    before,
    after: next.data.rows.length,
  });
  return reconcileColors(parseProject(next));
}
export function recommendations(table, context = "") {
  const cols = profile(table),
    numericCount = cols.filter((c) => c.type === "number").length,
    cat = cols.find(
      (c) => c.type === "category" && c.distinct >= 2 && c.distinct <= 8,
    );
  const names = table.columns.join(" "),
    results = [];
  if (
    /事件|event|status/i.test(names) &&
    /随访|时间|time|duration/i.test(names)
  )
    results.push(
      {
        id: "kaplan_meier",
        reason:
          "检测到时间和事件列；确认一人一行、共同起点、1为事件且0为右删失后，可计算生存曲线与风险人数。",
      },
      {
        id: "swimmer",
        reason: "可逐个体查看随访长度与结局；需要唯一的个体编号。",
      },
    );
  if (
    /分类单元|物种|taxon|species|otu|asv/i.test(names) &&
    /计数|个体数|count/i.test(names)
  )
    results.push(
      {
        id: "rank_abundance",
        reason: "检测到分类单元与计数，可比较群落的丰度排序。",
      },
      {
        id: "rarefaction",
        reason:
          "若数据为真实整数个体计数，可计算无放回抽样的期望物种数；不能使用相对丰度。",
      },
    );
  if (
    /染色体|chromosome|chr/i.test(names) &&
    /起点|start|begin/i.test(names) &&
    /终点|end|stop/i.test(names)
  )
    results.push({
      id: "genomic_intervals",
      reason: "检测到染色体与起止坐标；请统一基因组版本及0基半开区间约定。",
    });
  if (/日期|date/i.test(names) && numericCount)
    results.push({
      id: "calendar_heatmap",
      reason:
        "存在日期和数值，可逐日查看观测；同一天只能一条汇总记录，缺测不会自动补零。",
    });
  if (/假阳性率|fpr/i.test(names) && /真阳性率|tpr/i.test(names))
    results.push({
      id: "roc",
      reason: "检测到已有的假阳性率和真阳性率，可展示模型评价曲线。",
    });
  if (/召回率|recall/i.test(names) && /精确率|precision/i.test(names))
    results.push({
      id: "precision_recall",
      reason: "检测到已有召回率和精确率，可展示 PR 曲线。",
    });
  if (/生存概率|survival/i.test(names) && /时间|time|随访/i.test(names))
    results.push({
      id: "survival",
      reason: "检测到已有随访时间和生存概率；不代替原始生存数据分析。",
    });
  if (/染色体|chromosome/i.test(names) && /位置|position/i.test(names))
    results.push({
      id: "manhattan",
      reason: "检测到染色体和位置列，需要已有显著性结果才能绘制。",
    });
  if (/一致性|方法比较|agreement/i.test(context) && numericCount >= 2)
    results.push({
      id: "bland_altman",
      reason: "实验背景涉及测量方法比较，需确认同一样本的两种同单位测量。",
    });
  if (
    /log.?2.?fc|对数倍数/i.test(names) &&
    /padj|fdr|显著|p.?value/i.test(names)
  )
    results.push({
      id: "volcano",
      reason: "检测到已有的效应与显著性列，可展示差异结果；需确认显著性类型。",
    });
  if (/配对|同一|重复测量|paired/i.test(context))
    results.push({
      id: "paired",
      reason: "实验描述涉及重复测量，需要个体编号确认配对。",
    });
  if (cat && numericCount)
    results.push(
      {
        id: "strip",
        reason: "存在分组和数值列，先展示原始观测可保留样本信息。",
      },
      { id: "box", reason: "可比较各组中位数与四分位范围。" },
    );
  const densityMapping = suggestMapping("raincloud", table),
    densityGroups = new Map();
  if (densityMapping.group && densityMapping.value) {
    for (const row of table.rows) {
      const key = row[densityMapping.group],
        value = row[densityMapping.value];
      if (
        key == null ||
        String(key).trim() === "" ||
        value == null ||
        String(value).trim() === "" ||
        !Number.isFinite(Number(value))
      )
        continue;
      if (!densityGroups.has(String(key))) densityGroups.set(String(key), []);
      densityGroups.get(String(key)).push(Number(value));
    }
  }
  if (
    cat &&
    densityGroups.size &&
    [...densityGroups.values()].every(
      (v) => v.length >= 8 && new Set(v).size >= 2,
    )
  )
    results.push(
      {
        id: "raincloud_horizontal",
        reason:
          "各组有足够的变化观测，可用云雨图同时展示分布、箱线摘要和原始散点。",
      },
      {
        id: "violin",
        reason: "各组具有一定样本量，可补充分布形状；仍应保留原始点。",
      },
    );
  if (numericCount >= 2)
    results.push({
      id: "scatter",
      reason: "存在多个数值列，可探索变量之间的关系。",
    });
  if (numericCount >= 3)
    results.push({
      id: "pca",
      reason: "存在多个数值特征，可探索样本总体差异；需确认量纲。",
    });
  if (!results.length)
    results.push({
      id: "histogram",
      reason: "可先查看单一数值列的分布，需要选择有效测量列。",
    });
  return {
    engine: "local-rules",
    notice: "离线规则建议，不是大语言模型分析；请结合实验设计选择。",
    results: [...new Map(results.map((r) => [r.id, r])).values()],
  };
}
