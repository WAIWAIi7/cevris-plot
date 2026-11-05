import React from "react";
import { chartNumber } from "../shared/home.mjs";
import {
  Search,
  X,
  Star,
  ArrowUpRight,
  Download,
  LayoutGrid,
  ChartColumn,
  ScatterChart,
  ChartLine,
  ChartCandlestick,
  ChartNoAxesColumn,
  Grid2X2,
  CircleDot,
  ChartNoAxesGantt,
  ChartPie,
  Network,
  Dna,
  GitBranch,
  Radar,
  CalendarDays,
  CloudRain,
} from "lucide-react";
import { CHART_TYPES } from "../shared/chart-types.mjs";
import { tx, currentLocale } from "./i18n";
const icons: any = {
  CloudRain,
  ChartColumn,
  ScatterChart,
  ChartLine,
  ChartCandlestick,
  ChartNoAxesColumn,
  Grid2X2,
  Circles: CircleDot,
  ChartNoAxesGantt,
  ChartPie,
  Network,
  Dna,
  GitBranch,
  Radar,
  CalendarDays,
  CircleDot,
};
export function StudioLibrary({
  catalog,
  visibleRecipes,
  query,
  setQuery,
  family,
  setFamily,
  scope,
  setScope,
  favorites,
  setFavorites,
  clearFilters,
  useExample,
  downloadExample,
  busy,
}: any) {
  const locale = currentLocale();
  const heading = (c: any) => (locale === "en" ? c.en : c.zh);
  const groups = CHART_TYPES.map((c) => ({
    ...c,
    items: c.recipes
      .map((id) => visibleRecipes.find((r: any) => r.id === id))
      .filter(Boolean),
  })).filter((c) => c.items.length);
  return (
    <main id="main-content" tabIndex={-1} className="atlas-layout">
      <aside className="atlas-sidebar" aria-label={tx("图表分类")}>
        <div className="atlas-sidebar-heading">
          <LayoutGrid size={18} />
          <strong>{tx("图表库")}</strong>
          <span>{catalog.length}</span>
        </div>
        <nav aria-label={tx("按图形分类")}>
          <button
            className={family === "全部" ? "active" : ""}
            aria-pressed={family === "全部"}
            onClick={() => setFamily("全部")}
          >
            <LayoutGrid size={18} />
            <span>{tx("全部图形")}</span>
            <small>{catalog.length}</small>
          </button>
          {CHART_TYPES.map((c) => {
            const Icon = icons[c.icon];
            const n = c.recipes.filter((id) =>
              catalog.some((r: any) => r.id === id),
            ).length;
            return (
              n > 0 && (
                <button
                  key={c.id}
                  className={family === c.id ? "active" : ""}
                  aria-pressed={family === c.id}
                  onClick={() => setFamily(c.id)}
                >
                  <Icon size={18} />
                  <span>{heading(c)}</span>
                  <small>{n}</small>
                </button>
              )
            );
          })}
        </nav>
      </aside>
      <section className="atlas-main">
        <div className="atlas-tools">
          <div className="searchbox">
            <Search size={18} />
            <input
              id="library-search"
              aria-label={tx("搜索图表")}
              placeholder={tx("搜索图形，如柱状图、heatmap…")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <button aria-label={tx("清空搜索")} onClick={() => setQuery("")}>
                <X size={16} />
              </button>
            ) : (
              <kbd>/</kbd>
            )}
          </div>
          <div
            className="atlas-scopes"
            role="group"
            aria-label={tx("筛选图表")}
          >
            {[
              ["all", "全部"],
              ["favorites", "收藏"],
              ["recent", "最近使用"],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={scope === id}
                className={scope === id ? "active" : ""}
                onClick={() => setScope(id)}
              >
                {tx(label)}
              </button>
            ))}
          </div>
          <span className="atlas-result-count" aria-live="polite">
            {visibleRecipes.length} {tx("种图形")}
          </span>
        </div>
        {groups.map((c) => (
          <section
            className="atlas-group"
            key={c.id}
            aria-labelledby={"category-" + c.id}
          >
            <div className="atlas-section-heading">
              <h2 id={"category-" + c.id}>{heading(c)}</h2>
              <span>{c.items.length}</span>
              <div />
            </div>
            <div className="atlas-grid">
              {c.items.map((r: any) => (
                <article className="atlas-card" key={r.id}>
                  <button
                    className="atlas-open"
                    disabled={!!busy}
                    onClick={() => useExample(r.id)}
                    aria-label={tx("绘制") + " " + r.name}
                  >
                    <div className="atlas-thumbnail">
                      <span className="chart-number">{chartNumber(r.id)}</span>
                      <img
                        loading="lazy"
                        src={"/thumbnails/" + r.id + ".svg?v=6"}
                        alt={r.name}
                      />
                      <span className="atlas-open-hint">
                        {tx("开始绘制")}
                        <ArrowUpRight size={15} />
                      </span>
                    </div>
                    <div className="atlas-card-name">
                      <h3>{r.name}</h3>
                      <ArrowUpRight size={16} />
                    </div>
                  </button>
                  <div className="atlas-card-tools">
                    <button
                      className="text-button"
                      title={tx("下载英文模拟数据")}
                      onClick={() => downloadExample(r.id)}
                    >
                      <Download size={13} />
                      {tx("示例数据")}
                    </button>
                    <button
                      className={
                        "atlas-favorite " +
                        (favorites.includes(r.id) ? "selected" : "")
                      }
                      aria-pressed={favorites.includes(r.id)}
                      aria-label={tx("收藏") + " " + r.name}
                      onClick={() =>
                        setFavorites((a: string[]) =>
                          a.includes(r.id)
                            ? a.filter((v) => v !== r.id)
                            : [...a, r.id],
                        )
                      }
                    >
                      <Star
                        size={15}
                        fill={
                          favorites.includes(r.id) ? "currentColor" : "none"
                        }
                      />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
        {!groups.length && (
          <div className="atlas-empty">
            <Search size={30} />
            <h2>{tx("没有匹配的图形")}</h2>
            <button className="secondary" onClick={clearFilters}>
              {tx("清除筛选")}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
