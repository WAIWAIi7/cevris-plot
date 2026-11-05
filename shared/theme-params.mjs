const optional = (label, section, min, max) => ({
  label,
  section,
  type: "optionalNumber",
  min,
  max,
  default: null,
  step: "any",
  hint: "留空继承全局设置。",
});
const color = (label, section, value = "#2E2E33") => ({
  label,
  section,
  type: "color",
  default: value,
});
const toggle = (label, section, value = true) => ({
  label,
  section,
  type: "boolean",
  default: value,
});
const range = (label, section, min, max, step, def) => ({
  label,
  section,
  type: "range",
  min,
  max,
  step,
  default: def,
});
export const themeParams = {
  ...Object.fromEntries(
    ["x", "y"].flatMap((a) => {
      const prefix = a === "x" ? "横轴" : "纵轴",
        section = a + "axis";
      return Object.entries({
        [`${a}AxisLabels`]: toggle(prefix + "刻度文字", section),
        [`${a}AxisLine`]: toggle(prefix + "轴线", section),
        [`${a}AxisTicks`]: toggle(prefix + "刻度线", section),
        [`${a}AxisFontSize`]: optional(
          prefix + "文字大小（磅）",
          section,
          6,
          36,
        ),
        [`${a}AxisColor`]: color(prefix + "颜色", section),
        [`${a}AxisLinewidth`]: optional(
          prefix + "线宽（ggplot）",
          section,
          0,
          3,
        ),
        [`${a}AxisTitleSize`]: optional(
          prefix + "标题大小（磅）",
          section,
          6,
          40,
        ),
        [`${a}AxisTitleGap`]: optional(
          prefix + "标题间距（毫米）",
          section,
          0,
          25,
        ),
        [`${a}TickLength`]: optional(
          prefix + "刻度长度（毫米）",
          section,
          -5,
          10,
        ),
        [`${a}Grid`]: toggle(prefix + "网格线", section, false),
      });
    }),
  ),
  yAxisAngle: range("纵轴文字角度", "yaxis", -90, 90, 5, 0),
  gridColor: color("网格线颜色", "canvas", "#D6E0E7"),
  gridWidth: optional("网格线宽（ggplot）", "canvas", 0, 2),
  panelBackground: color("绘图区背景", "canvas", "#F1F5F9"),
  titleVisible: toggle("显示图形标题", "title"),
  titleSize: optional("标题字号（磅）", "title", 6, 40),
  titleColor: color("标题颜色", "title"),
  titleAlign: range("标题对齐", "title", 0, 1, 0.1, 0.5),
  titleFace: {
    label: "标题字重",
    section: "title",
    type: "select",
    options: {
      plain: "常规",
      bold: "加粗",
      italic: "斜体",
      "bold.italic": "粗斜体",
    },
    default: "bold",
  },
  legendSize: optional("图例字号（磅）", "legend", 6, 30),
  legendTitleVisible: toggle("显示图例标题", "legend"),
  legendBackground: color("图例背景", "legend", "#F1F5F9"),
  captionSize: optional("图注字号（磅）", "title", 6, 26),
  ...Object.fromEntries(
    [
      ["Top", "上"],
      ["Right", "右"],
      ["Bottom", "下"],
      ["Left", "左"],
    ].map(([key, zh]) => [
      "margin" + key,
      optional(zh + "侧留白（毫米）", "canvas", 0, 40),
    ]),
  ),
};
export const themeKeys = Object.keys(themeParams);
