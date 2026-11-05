import { PALETTE, recipeById } from "./catalog.mjs";
import { PALETTES } from "./palettes.mjs";
import { categoricalColors } from "./palette-scale.mjs";
export function reconcileColors(p) {
  const field =
    p.mapping.component ||
    p.mapping.series ||
    p.mapping.group ||
    (p.recipeId === "sankey" ? p.mapping.source : null) ||
    (p.recipeId === "alluvial" ? p.mapping.stage1 : null);
  const groups =
    p.recipeId === "chord"
      ? [
          ...new Set(
            p.data.rows
              .flatMap((r) => [r[p.mapping.source], r[p.mapping.target]])
              .filter(
                (v) => v !== null && v !== undefined && String(v).trim() !== "",
              )
              .map(String),
          ),
        ]
      : p.recipeId === "volcano"
        ? ["Up", "Down", "Not significant"]
        : field
          ? [
              ...new Set(
                p.data.rows
                  .map((r) => r[field])
                  .filter(
                    (v) =>
                      v !== null && v !== undefined && String(v).trim() !== "",
                  )
                  .map(String),
              ),
            ]
          : recipeById(p.recipeId)?.roles.some((r) => r.id === "group")
            ? ["All"]
            : [];
  const order = [
    ...p.groupOrder.filter((g) => groups.includes(g)),
    ...groups
      .filter((g) => !p.groupOrder.includes(g))
      .sort((a, b) => a.localeCompare(b, "zh-CN")),
  ];
  const colors =
      order.length && !order.some((name) => Object.hasOwn(p.colors, name))
        ? {}
        : { ...p.colors },
    volcano = {
      Up: p.colors["上调"] || "#B5522A",
      Down: p.colors["下调"] || "#5B7EA6",
      "Not significant": p.colors["未达到阈值"] || "#AAB5BE",
    };
  const selected = PALETTES.find(
    (palette) => palette.id === p.paletteId && palette.kind === "categorical",
  );
  const swatches = categoricalColors(
    selected?.colors || PALETTE,
    order.length + Object.keys(colors).length + PALETTE.length,
  );
  const used = new Set(Object.values(colors).map((c) => c.toUpperCase()));
  let cursor = 0;
  for (const g of order)
    if (!Object.hasOwn(colors, g))
      if (p.recipeId === "volcano") colors[g] = volcano[g];
      else {
        while (used.has(swatches[cursor])) cursor++;
        Object.defineProperty(colors, g, {
          value: swatches[cursor++],
          writable: true,
          enumerable: true,
          configurable: true,
        });
        used.add(colors[g]);
      }
  return { ...p, colors, groupOrder: order };
}
