import { recipeById } from "./catalog.mjs";
import { exampleProject } from "./examples.mjs";
const both = (zh, en) => ({ zh, en });
export function inputGuide(id) {
  const r = recipeById(id);
  if (!r) throw new Error("未知图表");
  const p = exampleProject(id),
    fields = r.roles.map((role) => ({
      ...role,
      example: p.mapping[role.id] || null,
    }));
  let row = both(
    "每行是一条观测或记录，按下方示例准备数据。",
    "One observation or record per row. Follow the example below.",
  );
  const rules = [];
  if (r.roles.some((role) => role.id === "columns")) {
    row = both(
      "宽表：每行一个样本，每列一个数值指标。样本编号和分组放在单独列。",
      "Wide table: one sample per row and one numeric feature per column. Keep sample IDs and groups in separate columns.",
    );
    rules.push(
      both(
        "参与计算的数值列不能是常数列；至少提供3个完整样本。",
        "Selected features must vary; provide at least three complete samples.",
      ),
    );
  } else if (
    r.roles.some((role) => role.id === "row") &&
    r.roles.some((role) => role.id === "column")
  ) {
    row = both(
      "长表：每行一个“行名称 × 列名称”的单元格及其数值。矩阵宽表可在导入后展开。",
      "Long table: one row–column cell and its value per record. A wide matrix can be reshaped after import.",
    );
    rules.push(
      both(
        "同一单元格只出现一次；缺失单元格不能用0代替。",
        "Each cell must be unique. Do not replace missing cells with zero.",
      ),
    );
  } else if (
    /^(bar($|_)|grouped_bar|box$|grouped_box$|violin$|grouped_violin$|raincloud|grouped_raincloud$|strip$|beeswarm$|density$|histogram$|ridgeline$|mean_interval$)/.test(
      id,
    ) &&
    !["bar_line"].includes(id)
  ) {
    row = r.roles.find((role) => role.id === "group")?.required
      ? both(
          "原始观测长表：每行一个独立样本，至少包含分组和测量值。",
          "Raw observations in long format: one independent sample per row, with group and measurement columns.",
        )
      : both(
          "原始观测长表：每行一个独立样本，提供数值测量列；分组列可选。",
          "Raw observations in long format: one independent sample per row, with a numeric measurement column and an optional group column.",
        );
    rules.push(
      both(
        "不要用“均值±标准差”文本代替原始值；技术重复应按实验单位合理整理。",
        "Do not substitute mean ± SD text for raw observations. Handle technical replicates according to the experimental unit.",
      ),
    );
    if (/raincloud|violin|density|ridgeline/.test(id))
      rules.push(
        both(
          "密度层每组至少3条且有数值变化；分组图按每个分组组合检查。",
          "Density needs at least three varying observations per group; grouped charts validate each combination.",
        ),
      );
  } else if (id === "volcano") {
    row = both(
      "已有差异分析结果：每行一个基因，包含 log2 倍数变化和 P 值或校正后 P 值。",
      "Precomputed differential results: one gene per row with log2 fold change and raw or adjusted P value.",
    );
    rules.push(
      both(
        "输入 P 值应大于0且不超过1；不要输入 -log10(P)。本工具不从原始计数执行差异分析。",
        "P values must be in (0, 1], not -log10(P). Raw counts are not analyzed for differential expression here.",
      ),
    );
  } else if (id === "kaplan_meier") {
    row = both(
      "每个个体一行：随访时间、事件状态和可选分组。事件=1，右删失=0。",
      "One individual per row: follow-up time, event status and optional group. Event=1; right-censored=0.",
    );
  } else if (id === "paired") {
    row = both(
      "每个个体在每个条件下一行；必须保留个体编号，不能按行号猜配对。",
      "One record per subject and condition. Retain subject IDs; row order does not define pairing.",
    );
  } else if (["forest", "ribbon", "survival"].includes(id)) {
    row = both(
      "已有估计长表：每行一个条目或时间点，提供数值和本图要求的区间列。",
      "Precomputed estimates in long format: one term or time point per row, with values and any required interval columns.",
    );
  } else if (
    ["stacked_bar", "percent_bar", "grouped_stacked_bar"].includes(id)
  ) {
    row = both(
      "组成长表：每行一个分组与组成类别组合，提供非负数值。",
      "Composition in long format: one group–component combination per row with a nonnegative value.",
    );
  } else if (id === "calendar_heatmap") {
    row = both(
      "每个日期一行，日期使用 YYYY-MM-DD，测量值放在独立数值列。",
      "One date per row, formatted YYYY-MM-DD, with a separate numeric value column.",
    );
  }
  return {
    id,
    row,
    rules,
    fields,
    columns: p.data.columns,
    rows: p.data.rows.slice(0, 4),
    notes: r.notes,
  };
}
