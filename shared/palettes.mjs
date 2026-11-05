import { activeParams, PALETTE } from "./catalog.mjs";
import { categoricalColors } from "./palette-scale.mjs";

// Original curated presets. Keep the four existing schemes stable for old projects.
const entry = (id, zh, en, colors, kind = "categorical", legacy = false) =>
  Object.freeze({
    id,
    zh,
    en,
    colors: Object.freeze(colors.split(" ")),
    kind,
    legacy,
  });
export const PALETTES = Object.freeze([
  entry(
    "science",
    "科学灵感",
    "Scientific inspiration",
    PALETTE.join(" "),
    "categorical",
    true,
  ),
  entry(
    "mist",
    "雾蓝层次",
    "Misty blue",
    "#315F7D #6389A3 #98B2C6 #B8CCD8",
    "categorical",
    true,
  ),
  entry(
    "nature",
    "自然生长",
    "Natural growth",
    "#3F6B4F #8BA77E #D9B382 #B5522A",
    "categorical",
    true,
  ),
  entry(
    "balance",
    "冷暖对照",
    "Warm and cool",
    "#5B7EA6 #D69CA0 #3F6B4F #D9B382",
    "categorical",
    true,
  ),
  entry(
    "ocean-coral",
    "深海珊瑚",
    "Ocean & coral",
    "#355C7D #D57868 #75A99C #D8B36A #8C7C9D #729BB4 #AB875F #62666D",
  ),
  entry(
    "indigo-amber",
    "靛蓝琥珀",
    "Indigo & amber",
    "#4C5F8A #CE9E45 #7BA48C #B96C78 #78AAB8 #9D89B4 #A98C70 #5A626A",
  ),
  entry(
    "forest-clay",
    "森林陶土",
    "Forest & clay",
    "#426B57 #BE755D #8DA384 #D6B878 #698D9E #AB879E #8F795C #58605B",
  ),
  entry(
    "sea-rose",
    "海盐玫瑰",
    "Sea salt & rose",
    "#4D8793 #C88394 #9DAE80 #D5AC71 #7B80AB #82B4AA #A78168 #5B6571",
  ),
  entry(
    "wisteria-olive",
    "紫藤橄榄",
    "Wisteria & olive",
    "#82709F #8E9D60 #C78372 #5E91A6 #C5A064 #A47B91 #72A094 #65616B",
  ),
  entry(
    "graphite-cherry",
    "石墨樱红",
    "Graphite & cherry",
    "#4B5663 #B85C72 #6A9F98 #CEA365 #7F88AE #B2927C #8CA36F #8F758F",
  ),
  entry(
    "lagoon-ochre",
    "湖蓝赭石",
    "Lagoon & ochre",
    "#327C94 #C48A4E #7EAA8F #BE7D8A #8C81AC #C6AE6F #6C8B9E #636A65",
  ),
  entry(
    "navy-berry",
    "深海浆果",
    "Navy & berry",
    "#3B567A #A56789 #69A293 #D0A65D #A98C6A #8995B8 #C78574 #657466",
  ),
  entry(
    "slate-apricot",
    "蓝灰杏黄",
    "Slate & apricot",
    "#627F99 #D6A06C #87A28E #BD8094 #A6A263 #8D83A3 #62A6AD #6F6761",
  ),
  entry(
    "turquoise-plum",
    "松石梅紫",
    "Turquoise & plum",
    "#3F9997 #99658A #CE9B60 #7E90B6 #9DA96D #CB8178 #7C9B84 #5B626E",
  ),
  entry(
    "autumn-field",
    "秋日原野",
    "Autumn field",
    "#A45E3F #C49D50 #7F9363 #477C79 #9281A4 #C17F83 #6F8DA4 #6B6259",
  ),
  entry(
    "herbarium",
    "植物标本",
    "Herbarium",
    "#49735D #9CAC77 #B68B54 #C38687 #638B9A #947AA1 #A99478 #60695F",
  ),
  entry(
    "nordic-coast",
    "北欧海岸",
    "Nordic coast",
    "#456C88 #79A6AD #D3B17C #BC7B70 #8FA383 #8D83A6 #AA956C #5D6673",
  ),
  entry(
    "mineral",
    "矿物晶石",
    "Mineral collection",
    "#477B87 #9D779D #BF9361 #6C9B7E #BD717F #7C88B0 #AAA16F #62646F",
  ),
  entry(
    "dusk",
    "暮色花园",
    "Dusk garden",
    "#6A698F #C47E87 #D4A76A #689994 #9AA478 #8C91AC #AA8268 #606A71",
  ),
  entry(
    "clear-contrast",
    "清晰对照",
    "Clear contrast",
    "#276487 #CE753C #389185 #A65D81 #B49D3E #786AA4 #769E59 #555D68",
  ),
  entry(
    "seq-ocean",
    "海洋渐变",
    "Ocean depth",
    "#EDF5F7 #7CA9BD #214C67",
    "sequential",
  ),
  entry(
    "seq-forest",
    "森林渐变",
    "Forest shade",
    "#F0F5EA #93B49A #28563F",
    "sequential",
  ),
  entry(
    "seq-plum",
    "梅紫渐变",
    "Plum shade",
    "#F6EFF5 #B09AB9 #553B6B",
    "sequential",
  ),
  entry(
    "seq-amber",
    "琥珀渐变",
    "Amber shade",
    "#FBF4E7 #D0A066 #79502A",
    "sequential",
  ),
  entry(
    "div-blue-rust",
    "蓝锈发散",
    "Blue & rust",
    "#3E7195 #F3F1EC #B35D40",
    "diverging",
  ),
  entry(
    "div-teal-rose",
    "青玫发散",
    "Teal & rose",
    "#287E7A #F2F1ED #AB5775",
    "diverging",
  ),
  entry(
    "div-plum-olive",
    "紫橄发散",
    "Plum & olive",
    "#795687 #F3F1ED #738347",
    "diverging",
  ),
  entry(
    "div-indigo-gold",
    "靛金发散",
    "Indigo & gold",
    "#4E6598 #F4F1E9 #AC7E2D",
    "diverging",
  ),
]);

const continuous = new Set([
  "enrichment",
  "dot_matrix",
  "calendar_heatmap",
  "hexbin",
  "bin2d",
  "contour",
  "filled_contour",
]);
export function paletteKind(project) {
  if (
    ["correlation", "correlation_bubble", "circular_heatmap"].includes(
      project.recipeId,
    )
  )
    return "diverging";
  if (["heatmap", "clustered_heatmap"].includes(project.recipeId))
    return project.params.normalization === "row_z"
      ? "diverging"
      : "sequential";
  return continuous.has(project.recipeId) ? "sequential" : "categorical";
}

export function paletteAvailability(project, palette) {
  if (palette.kind !== paletteKind(project)) return "kind";
  if (
    palette.kind === "categorical" &&
    project.recipeId !== "volcano" &&
    project.groupOrder.length > 100
  )
    return "capacity";
  return null;
}

// Only change existing color fields: measurement values, mappings, scale limits,
// normalization, thresholds, geometry and typography remain untouched.
export function palettePatch(project, palette) {
  const problem = paletteAvailability(project, palette);
  if (problem) throw new RangeError(`Palette ${palette.id}: ${problem}`);
  const colors = {},
    params = {},
    c =
      palette.kind === "categorical"
        ? categoricalColors(
            palette.colors,
            Math.max(palette.colors.length, project.groupOrder.length),
          )
        : palette.colors,
    active = activeParams(project.recipeId);
  if (palette.kind === "categorical") {
    if (project.recipeId === "volcano") {
      Object.assign(colors, {
        Down: c[0],
        Up: c[1],
        "Not significant": "#A8ADB4",
      });
    } else {
      project.groupOrder.forEach((g, i) => {
        Object.defineProperty(colors, g, {
          value: c[i],
          writable: true,
          enumerable: true,
          configurable: true,
        });
      });
    }
    if (active.includes("fillColor")) params.fillColor = c[0];
    if (active.includes("colorLow")) params.colorLow = c[0];
    if (active.includes("colorHigh")) params.colorHigh = c[1];
  } else {
    params.colorLow = c[0];
    if (active.includes("colorMid")) params.colorMid = c[1];
    params.colorHigh = c[2];
  }
  return { colors, params };
}
export function applyPalette(project, palette) {
  const patch = palettePatch(project, palette);
  for (const [name, value] of Object.entries(patch.colors))
    Object.defineProperty(project.colors, name, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  Object.assign(project.params, patch.params);
  project.paletteId = palette.id;
  return project;
}
export function matchesPalette(project, palette) {
  if (paletteAvailability(project, palette)) return false;
  const patch = palettePatch(project, palette);
  if (
    project.paletteId === palette.id &&
    palette.kind === "categorical" &&
    project.recipeId !== "volcano"
  ) {
    const swatches = new Set(
      categoricalColors(
        palette.colors,
        project.groupOrder.length +
          Object.keys(project.colors).length +
          palette.colors.length,
      ),
    );
    return (
      project.groupOrder.every((name) =>
        swatches.has(String(project.colors[name]).toUpperCase()),
      ) &&
      Object.entries(patch.params).every(
        ([key, value]) =>
          String(project.params[key]).toUpperCase() === value.toUpperCase(),
      )
    );
  }
  return Object.entries(patch).every(([section, values]) =>
    Object.entries(values).every(
      ([key, value]) =>
        String(project[section][key]).toUpperCase() === value.toUpperCase(),
    ),
  );
}
