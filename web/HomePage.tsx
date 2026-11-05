import React, { useState, useRef } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  LayoutGrid,
  Search,
  X,
} from "lucide-react";
import {
  chartNumber,
  normalizeHomeSelection,
  NUMBERED_RECIPES,
} from "../shared/home.mjs";
import { CHART_TYPES } from "../shared/chart-types.mjs";

export function HomePage({
  catalog,
  featured,
  onChange,
  onOpen,
  onLibrary,
  locale,
  busy,
}: any) {
  const en = locale === "en",
    [editing, setEditing] = useState(false),
    [selection, setSelection] = useState<string[]>([]),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("all"),
    [preview, setPreview] = useState<any>(null);
  const previewTrigger = useRef<HTMLButtonElement | null>(null);
  function closePreview() {
    setPreview(null);
    previewTrigger.current?.focus();
  }
  const words = query.toLowerCase().trim();
  const items = (editing ? NUMBERED_RECIPES : featured)
    .map((id: string) => catalog.find((r: any) => r.id === id))
    .filter(Boolean)
    .filter(
      (r: any) =>
        !editing ||
        ((category === "all" ||
          CHART_TYPES.find((c) => c.id === category)?.recipes.includes(r.id)) &&
          (!words ||
            `${chartNumber(r.id)} ${r.name} ${r.id}`
              .toLowerCase()
              .includes(words))),
    );
  function begin() {
    setSelection([...featured]);
    setEditing(true);
    setQuery("");
    setCategory("all");
  }
  function toggle(id: string) {
    setSelection((a) =>
      a.includes(id)
        ? a.filter((v) => v !== id)
        : a.length < 24
          ? [...a, id]
          : a,
    );
  }
  function move(i: number, delta: number) {
    setSelection((a) => {
      const b = [...a],
        j = i + delta;
      if (j < 0 || j >= b.length) return a;
      [b[i], b[j]] = [b[j], b[i]];
      return b;
    });
  }
  return (
    <main id="main-content" tabIndex={-1} className="home-page">
      <div className="home-heading">
        <div>
          <h1>
            {editing
              ? en
                ? "Choose home recommendations"
                : "选择主页推荐"
              : en
                ? "Recommended charts"
                : "推荐绘图"}
          </h1>
          <p>
            {editing
              ? en
                ? "Choose a specific chart by its preview and reference number. Selection order is display order."
                : "按具体效果与编号选择，勾选顺序就是主页展示顺序。"
              : en
                ? "Your chosen charts, ready to edit."
                : "你选定的图形，点击即可开始绘制。"}
          </p>
        </div>
        <div className="home-actions">
          {editing ? (
            <>
              <button className="secondary" onClick={() => setEditing(false)}>
                {en ? "Cancel" : "取消"}
              </button>
              <button
                className="primary"
                onClick={() => {
                  onChange(normalizeHomeSelection(selection));
                  setEditing(false);
                }}
              >
                {en ? "Save selection" : "保存选择"} ({selection.length}/24)
              </button>
            </>
          ) : (
            <>
              <button className="secondary" onClick={onLibrary}>
                <LayoutGrid size={17} />
                {en ? "All charts" : "全部图表"}
              </button>
              <button className="primary" onClick={begin}>
                <SlidersHorizontal size={17} />
                {en ? "Choose recommendations" : "选择推荐图表"}
              </button>
            </>
          )}
        </div>
      </div>
      {editing && (
        <>
          <div className="home-filter">
            <label>
              <Search size={16} />
              <input
                aria-label={
                  en ? "Search chart numbers or names" : "搜索图表编号或名称"
                }
                placeholder={en ? "Number or chart name" : "输入编号或图形名称"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label={en ? "Chart category" : "图形分类"}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">{en ? "All categories" : "全部分类"}</option>
              {CHART_TYPES.map((c) => (
                <option key={c.id} value={c.id}>
                  {en ? c.en : c.zh}
                </option>
              ))}
            </select>
          </div>
          <div
            className="selection-order"
            aria-label={en ? "Display order" : "推荐展示顺序"}
          >
            {selection.map((id, i) => (
              <div key={id}>
                <span>{chartNumber(id)}</span>
                <button
                  aria-label={
                    (en ? "Move earlier " : "前移 ") + chartNumber(id)
                  }
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  aria-label={(en ? "Move later " : "后移 ") + chartNumber(id)}
                  disabled={i === selection.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  aria-label={(en ? "Remove " : "取消选择 ") + chartNumber(id)}
                  onClick={() => toggle(id)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {!items.length ? (
        <div className="home-empty">
          <LayoutGrid size={36} />
          <h2>
            {editing
              ? en
                ? "No matching charts"
                : "没有匹配的图形"
              : en
                ? "Choose the charts for your home"
                : "推荐图表由你选择"}
          </h2>
          <p>
            {editing
              ? en
                ? "Try another number or category."
                : "请尝试其他编号或分类。"
              : en
                ? "Each template has its own preview and fixed number."
                : "每个具体模板都有独立预览和固定编号。"}
          </p>
          <button
            className="primary"
            onClick={
              editing
                ? () => {
                    setQuery("");
                    setCategory("all");
                  }
                : begin
            }
          >
            {editing
              ? en
                ? "Clear filters"
                : "清除筛选"
              : en
                ? "Browse numbered previews"
                : "查看编号与效果"}
          </button>
        </div>
      ) : (
        <div className="home-grid">
          {items.map((r: any) => (
            <article
              className={
                "home-chart " +
                (editing && selection.includes(r.id) ? "is-selected" : "")
              }
              key={r.id}
            >
              <button
                className="home-preview"
                onClick={(e) => {
                  if (editing) {
                    previewTrigger.current = e.currentTarget;
                    setPreview(r);
                  } else onOpen(r.id);
                }}
                disabled={!!busy}
                aria-label={
                  (en ? "Preview " : "查看效果 ") +
                  chartNumber(r.id) +
                  " " +
                  r.name
                }
              >
                <img
                  loading="lazy"
                  src={"/thumbnails/" + r.id + ".svg?v=6"}
                  alt={r.name}
                />
                <span className="chart-number">{chartNumber(r.id)}</span>
                <ArrowUpRight size={17} />
              </button>
              <div className="home-chart-caption">
                <h2>{r.name}</h2>
                {editing ? (
                  <button
                    className="home-select"
                    aria-label={
                      (en ? "Select " : "选择 ") +
                      chartNumber(r.id) +
                      " " +
                      r.name
                    }
                    aria-pressed={selection.includes(r.id)}
                    disabled={
                      !selection.includes(r.id) && selection.length >= 24
                    }
                    onClick={() => toggle(r.id)}
                  >
                    {selection.includes(r.id) ? (
                      <Check size={17} />
                    ) : (
                      <span className="select-square" />
                    )}
                    {en
                      ? selection.includes(r.id)
                        ? "Selected"
                        : "Select"
                      : selection.includes(r.id)
                        ? "已选择"
                        : "选择"}
                  </button>
                ) : (
                  <button onClick={() => onOpen(r.id)} disabled={!!busy}>
                    {en ? "Draw" : "开始绘制"}
                    <ArrowUpRight size={16} />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {preview && (
        <div
          className="home-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={
            (en ? "Chart preview " : "图表效果 ") + chartNumber(preview.id)
          }
          onKeyDown={(e) => {
            if (e.key === "Escape") closePreview();
            if (e.key === "Tab") {
              e.preventDefault();
            }
          }}
        >
          <button autoFocus className="secondary" onClick={closePreview}>
            <X size={17} />
            {en ? "Close preview" : "关闭预览"}
          </button>
          <img
            src={"/thumbnails/" + preview.id + ".svg?v=6"}
            alt={preview.name}
          />
          <h2>
            {chartNumber(preview.id)} · {preview.name}
          </h2>
        </div>
      )}
    </main>
  );
}
