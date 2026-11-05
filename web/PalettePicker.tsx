import React, { useState } from "react";
import { Check, Search, ArrowUpRight } from "lucide-react";
import {
  PALETTES,
  paletteKind,
  paletteAvailability,
  matchesPalette,
} from "../shared/palettes.mjs";
import "./palettes.css";
import { categoricalColors } from "../shared/palette-scale.mjs";

type Props = {
  project: any;
  locale: string;
  onApply: (palette: any) => void;
  onBrowse?: () => void;
};
const names: Record<string, string[]> = {
  categorical: ["分类配色", "Categorical"],
  sequential: ["连续渐变", "Sequential"],
  diverging: ["双向发散", "Diverging"],
};
const usesEndpoints = (id: string) =>
  [
    "enrichment",
    "dot_matrix",
    "calendar_heatmap",
    "hexbin",
    "bin2d",
    "contour",
    "filled_contour",
  ].includes(id);
function Swatches({ palette, endpoints = false, count = 0 }: any) {
  const colors = endpoints
    ? [palette.colors[0], palette.colors.at(-1)]
    : palette.kind === "categorical"
      ? categoricalColors(
          palette.colors,
          Math.min(32, Math.max(count, palette.colors.length)),
        )
      : palette.colors;
  return (
    <span
      className="scheme-swatches"
      aria-hidden="true"
      style={
        palette.kind === "categorical"
          ? undefined
          : { background: `linear-gradient(90deg, ${colors.join(",")})` }
      }
    >
      {palette.kind === "categorical" &&
        colors.map((c: string) => <i key={c} style={{ background: c }} />)}
    </span>
  );
}
export function PaletteQuick({ project, locale, onApply, onBrowse }: Props) {
  const en = locale === "en",
    candidates = PALETTES.filter((p) => p.kind === paletteKind(project));
  const selected = candidates.find((p) => matchesPalette(project, p));
  const preferred =
    paletteKind(project) === "categorical"
      ? [
          selected,
          ...["science", "ocean-coral", "forest-clay", "sea-rose"].map((id) =>
            candidates.find((p) => p.id === id),
          ),
          ...candidates,
        ]
      : candidates;
  const quick = [...new Set(preferred.filter(Boolean))]
    .filter((p) => !paletteAvailability(project, p))
    .slice(0, 4);
  return (
    <section className="property-section scheme-section">
      <div className="section-heading">
        <h3>{en ? "Color palette" : "配色方案"}</h3>
        <button className="small-link" onClick={onBrowse}>
          {en ? "Browse all" : "全部配色"}
          <ArrowUpRight size={13} />
        </button>
      </div>
      <div className="scheme-quick">
        {quick.map((p) => (
          <button
            key={p.id}
            title={en ? p.en : p.zh}
            aria-label={(en ? "Apply " : "应用") + (en ? p.en : p.zh)}
            aria-pressed={selected?.id === p.id}
            onClick={() => onApply(p)}
          >
            <Swatches
              palette={p}
              count={project.groupOrder.length}
              endpoints={usesEndpoints(project.recipeId)}
            />
            <small>{en ? p.en : p.zh}</small>
          </button>
        ))}
      </div>
      <span className="scheme-current">
        {selected
          ? en
            ? selected.en
            : selected.zh
          : en
            ? "Custom colors"
            : "自定义配色"}
      </span>
      {paletteKind(project) === "categorical" &&
        project.groupOrder.length > 12 && (
          <p className="scheme-note">
            {en
              ? "Many categories: keep labels or facets; color alone is harder to distinguish."
              : "类别较多，建议保留标签或使用分面，避免只靠颜色区分。"}
          </p>
        )}
    </section>
  );
}
export function PalettePicker({ project, locale, onApply }: Props) {
  const [query, setQuery] = useState("");
  const en = locale === "en",
    kind = paletteKind(project);
  const candidates = PALETTES.filter((p) => p.kind === kind);
  const visible = candidates.filter((p) =>
    `${p.zh} ${p.en}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const selected = candidates.find((p) => matchesPalette(project, p));
  // The two-stop R scales do not interpolate through the preset midpoint.
  const endpoints = usesEndpoints(project.recipeId);
  return (
    <div className="scheme-browser">
      <div className="scheme-browser-heading">
        <span>
          {names[kind][en ? 1 : 0]} <b>{candidates.length}</b>
        </span>
        <span>{en ? "Applied to this figure" : "应用于当前图形"}</span>
      </div>
      <div className="searchbox">
        <Search size={16} />
        <input
          aria-label={en ? "Search palettes" : "搜索配色"}
          placeholder={en ? "Search by name…" : "搜索配色名称…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {kind === "diverging" && (
        <p className="scheme-note">
          {en
            ? "Neutral midpoint follows the current scale; values and normalization stay unchanged."
            : "中性色对应当前色阶中心；数值和标准化方式保持不变。"}
        </p>
      )}
      {project.recipeId === "volcano" && (
        <p className="scheme-note">
          {en
            ? "Down and Up use separate colors. Not significant stays gray."
            : "下调与上调使用不同颜色，未达到阈值的点保持灰色。"}
        </p>
      )}
      <div className="scheme-grid">
        {visible.map((p) => {
          const disabled = !!paletteAvailability(project, p),
            name = en ? p.en : p.zh;
          return (
            <button
              key={p.id}
              className="scheme-card"
              disabled={disabled}
              aria-label={(en ? "Apply " : "应用") + name}
              aria-pressed={selected?.id === p.id}
              onClick={() => onApply(p)}
            >
              <Swatches
                palette={p}
                count={project.groupOrder.length}
                endpoints={endpoints}
              />
              <span className="scheme-card-title">
                {name}
                {selected?.id === p.id && <Check size={15} />}
              </span>
              <small>
                {disabled
                  ? en
                    ? "Up to 100 categories"
                    : "最多支持 100 个类别"
                  : kind === "categorical"
                    ? en
                      ? project.groupOrder.length > p.colors.length
                        ? `${p.colors.length} base → ${project.groupOrder.length} colors`
                        : `${p.colors.length} colors · adapts to groups`
                      : project.groupOrder.length > p.colors.length
                        ? `${p.colors.length} 基础色 → ${project.groupOrder.length} 色`
                        : `${p.colors.length} 色 · 随类别适配`
                    : en
                      ? "Low → high"
                      : "低值 → 高值"}
              </small>
            </button>
          );
        })}
      </div>
      {!visible.length && (
        <p className="scheme-note">
          {en ? "No matching palettes." : "没有匹配的配色。"}
        </p>
      )}
    </div>
  );
}
