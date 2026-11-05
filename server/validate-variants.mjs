import { variantIds } from "../shared/recipes-v6.mjs";
export function validateVariants(p, rows, issues, warnings) {
  if (!variantIds.has(p.recipeId)) return;
  const id = p.recipeId,
    m = p.mapping,
    vals = (k) => rows.map((r) => r[m[k]]),
    unique = (k) => new Set(vals(k)).size;
  if (["binary_heatmap", "circular_heatmap"].includes(id)) {
    const pairs = new Set(
      rows.map((r) => JSON.stringify([r[m.row], r[m.column]])),
    );
    if (pairs.size !== rows.length)
      issues.push("Duplicate matrix cells must be resolved before plotting.");
    if (pairs.size !== unique("row") * unique("column"))
      issues.push("Supply a complete matrix; missing cells are not zero.");
    if (
      id === "binary_heatmap" &&
      vals("value").some((v) => ![0, 1].includes(Number(v)))
    )
      issues.push("Binary heatmap accepts only explicit 0 or 1 values.");
    if (id === "circular_heatmap" && p.params.normalization === "row_z")
      for (const row of new Set(vals("row")))
        if (
          new Set(
            rows.filter((r) => r[m.row] === row).map((r) => Number(r[m.value])),
          ).size < 2
        )
          issues.push("Row standardization requires variation in every row.");
  }
  if (id === "correlation_bubble") {
    if (rows.length < 3 || !Array.isArray(m.columns) || m.columns.length < 2)
      issues.push(
        "Correlation requires at least two variables and three observations.",
      );
    if (m.columns?.some((c) => new Set(rows.map((r) => Number(r[c]))).size < 2))
      issues.push("Constant variables cannot be correlated.");
  }
  if (
    ["grouped_stacked_bar", "circular_bar"].includes(id) &&
    vals("value").some((v) => Number(v) < 0)
  )
    issues.push("Composition and sector values must be nonnegative.");
  if (id === "circular_bar" && unique("group") !== rows.length)
    issues.push("Supply one summary per category.");
  if (id === "bar_line" && unique("group") !== rows.length)
    issues.push("Supply one observed/reference pair per group.");
  if (
    id === "grouped_stacked_bar" &&
    new Set(
      rows.map((r) =>
        JSON.stringify([r[m.group], r[m.series], r[m.component]]),
      ),
    ).size !== rows.length
  )
    issues.push("Supply one summary per group, series and component.");
  if (
    ["phenotype", "factorial"].includes(p.data.exampleKind) ||
    id.startsWith("bar_") ||
    id.startsWith("grouped_")
  ) {
    if (!["bar_line", "grouped_stacked_bar"].includes(id)) {
      const cells = new Map();
      for (const r of rows) {
        const key = JSON.stringify([r[m.group], r[m.series] ?? ""]);
        cells.set(key, [...(cells.get(key) || []), Number(r[m.value])]);
      }
      if (
        id === "grouped_violin" &&
        [...cells.values()].some((v) => v.length < 3 || new Set(v).size < 2)
      )
        issues.push("Each violin needs at least three varying observations.");
      if (
        !["grouped_violin", "grouped_box"].includes(id) &&
        p.params.errorType !== "none" &&
        [...cells.values()].some((v) => v.length < 2)
      )
        issues.push(
          "Each group needs at least two observations for error bars.",
        );
    }
  }
}
