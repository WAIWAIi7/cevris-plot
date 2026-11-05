import React, { useMemo, useRef, useLayoutEffect, useState } from "react";
import { tx } from "./i18n";
const hexColour = (colour: string) => {
  const rgb = colour.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  return rgb
    ? "#" +
        rgb
          .slice(1, 4)
          .map((v) => (+v).toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase()
    : colour.toUpperCase();
};

const shade = (hex: string, t: number) =>
  "#" +
  (hex.slice(1).match(/../g) || [])
    .map((x) => {
      const n = parseInt(x, 16);
      return Math.round(t < 0 ? n * (1 + t) : n + (255 - n) * t)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")
    .toUpperCase();

// Only restyle the SVG produced by our R renderer. All scientific geometry and final exports remain R-authored.
export function liveSvg(
  source: string,
  before: any,
  after: any,
  meta: any = {},
) {
  if (!source || !before || before.recipeId !== after.recipeId) return source;
  const a = before.params,
    b = after.params;
  const doc = new DOMParser().parseFromString(source, "image/svg+xml"),
    root = doc.documentElement;
  if (root.tagName !== "svg") return source;
  const colour = new Map<string, string>();
  const fills = new Set(
    [...Object.values(after.colors), b.fillColor, b.colorLow, b.colorHigh].map(
      (x: any) => x.toUpperCase(),
    ),
  );
  for (const k of new Set([
    ...Object.keys(before.colors),
    ...Object.keys(after.colors),
  ])) {
    if (!before.colors[k] || !after.colors[k]) continue;
    colour.set(before.colors[k].toUpperCase(), after.colors[k]);
    for (const t of [-0.22, 0.38])
      colour.set(shade(before.colors[k], t), shade(after.colors[k], t));
  }
  for (const k of [
    "background",
    "fillColor",
    "colorLow",
    "colorMid",
    "colorHigh",
  ]) {
    if (a[k] === b[k]) continue;
    colour.set(a[k].toUpperCase(), b[k]);
    for (const t of [-0.22, 0.38]) colour.set(shade(a[k], t), shade(b[k], t));
  }
  for (const el of Array.from(root.querySelectorAll("*"))) {
    const oldStroke = Number(
      (el.getAttribute("style") || "").match(/stroke-width:\s*([\d.]+)/)?.[1] ||
        0,
    );
    for (const attr of ["style", "fill", "stroke"]) {
      const value = el.getAttribute(attr);
      if (!value) continue;
      let next = value.replace(
        /#[0-9a-f]{6}/gi,
        (x) => colour.get(x.toUpperCase()) || x,
      );
      if (attr === "style") {
        if (a.linewidth !== b.linewidth)
          next = next.replace(
            /stroke-width:\s*([\d.]+)/g,
            (_, n) => "stroke-width: " + (+n * b.linewidth) / a.linewidth,
          );
        if (a.fontSize !== b.fontSize)
          next = next.replace(
            /font-size:\s*([\d.]+)px/g,
            (_, n) => "font-size: " + (+n * b.fontSize) / a.fontSize + "px",
          );
        if (a.fontFamily !== b.fontFamily)
          next = next.replace(
            /font-family:[^;]+/g,
            'font-family: "' + b.fontFamily + '"',
          );
        if (a.alpha !== b.alpha && a.alpha > 0)
          next = next.replace(
            /(fill|stroke)-opacity:\s*([\d.]+)/g,
            (_, kind, n) =>
              kind + "-opacity: " + Math.min(1, (+n * b.alpha) / a.alpha),
          );
      }
      el.setAttribute(attr, next);
    }
    const style = (el as SVGElement).style;
    if (
      ["circle", "polygon", "path", "rect"].includes(el.tagName) &&
      a.outline !== b.outline
    ) {
      const fill = hexColour(style?.fill || el.getAttribute("fill") || "");
      if (
        fills.has(fill) ||
        (el.tagName === "circle" && /^#[0-9A-F]{6}$/.test(fill))
      ) {
        style.stroke =
          b.outline === "none"
            ? "none"
            : shade(
                after.recipeId === "dot_matrix" ? b.colorHigh : fill,
                b.outline === "lighter" ? 0.38 : -0.22,
              );
        style.strokeWidth = String(
          b.outline === "none"
            ? 0
            : b.linewidth * (el.tagName === "circle" ? 1.42 : 2.134),
        );
      }
    }
    if (
      a.bandAlpha !== b.bandAlpha &&
      a.bandAlpha > 0 &&
      ["polygon", "path"].includes(el.tagName)
    ) {
      const opacity = Number(style?.fillOpacity);
      if (Math.abs(opacity - a.bandAlpha) < 0.01)
        style.fillOpacity = String(b.bandAlpha);
    }
    if (
      el.tagName === "circle" &&
      (a.pointSize !== b.pointSize ||
        a.linewidth !== b.linewidth ||
        a.outline !== b.outline) &&
      el.hasAttribute("r")
    )
      el.setAttribute(
        "r",
        String(
          Math.max(
            0,
            ((Number(el.getAttribute("r")) - oldStroke / 2) * b.pointSize) /
              a.pointSize +
              parseFloat(style.strokeWidth || String(oldStroke)) / 2,
          ),
        ),
      );
    if (el.tagName === "text") {
      const content = el.textContent;
      for (const key of ["title", "x", "y", "note"]) {
        const old = before.labels[key] || meta.renderLabels?.[key];
        if (
          old &&
          content === old &&
          after.labels[key] &&
          after.labels[key] !== old
        ) {
          el.textContent = after.labels[key];
          el.removeAttribute("textLength");
        }
      }
      if (a.fontSize !== b.fontSize && el.hasAttribute("textLength"))
        el.setAttribute(
          "textLength",
          String(
            (Number(el.getAttribute("textLength")) * b.fontSize) / a.fontSize,
          ),
        );
      const mm = 72 / 25.4,
        d = (b.axisTitleGap - a.axisTitleGap) * mm;
      if (d && content === (before.labels.x || meta.renderLabels?.x))
        el.setAttribute(
          "transform",
          `translate(0 ${d}) ` + (el.getAttribute("transform") || ""),
        );
      if (d && content === (before.labels.y || meta.renderLabels?.y))
        el.setAttribute(
          "transform",
          `translate(${-d} 0) ` + (el.getAttribute("transform") || ""),
        );
    }
  }
  root.setAttribute("width", "100%");
  root.setAttribute("height", "100%");
  return new XMLSerializer().serializeToString(root);
}
export function LiveFigure({
  svg,
  before,
  project,
  metadata,
  zoom,
}: {
  svg: string;
  before: any;
  project: any;
  metadata: any;
  zoom: number;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const [fitWidth, setFitWidth] = useState(400);
  useLayoutEffect(() => {
    const stage = sheet.current?.parentElement;
    if (!stage) return;
    const resize = () =>
      setFitWidth(
        Math.max(
          100,
          Math.min(
            620,
            stage.clientWidth * 0.76,
            (stage.clientHeight * 0.72 * project.params.widthMm) /
              project.params.heightMm,
          ),
        ),
      );
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [project.params.widthMm, project.params.heightMm]);
  const frame = useMemo(() => {
    const started = performance.now();
    const markup = liveSvg(svg, before, project, metadata);
    return { markup, ms: performance.now() - started };
  }, [svg, before, project, metadata]);
  return (
    <div
      className="live-figure"
      ref={sheet}
      role="img"
      aria-label={project.labels.title || tx("科研图形预览")}
      data-live-preview="true"
      data-preview-mode={before === project ? "exact" : "live"}
      data-feedback-ms={frame.ms.toFixed(2)}
      style={{
        width: `${fitWidth * zoom}px`,
        aspectRatio: `${project.params.widthMm}/${project.params.heightMm}`,
      }}
      dangerouslySetInnerHTML={{ __html: frame.markup }}
    />
  );
}
