import React, { useState, useRef, useEffect } from "react";
import {
  Download,
  Plus,
  Upload,
  ArrowUp,
  ArrowDown,
  X,
  Undo2,
  Redo2,
  SlidersHorizontal,
  PanelsTopLeft,
  Edit3,
} from "lucide-react";
import { api, download } from "./api";
import { addPanel, syncPanelSettings } from "../shared/composition.mjs";
import { chartNumber } from "../shared/home.mjs";

export function Composition({
  value,
  onChange,
  onEdit,
  onAddCurrent,
  catalog,
  locale,
  connected,
}: any) {
  const en = locale === "en",
    [selected, setSelected] = useState(""),
    [includeAnalysis, setIncludeAnalysis] = useState(false),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [url, setUrl] = useState(""),
    [updating, setUpdating] = useState(false),
    [format, setFormat] = useState("pdf"),
    [zoom, setZoom] = useState(50),
    [saved, setSaved] = useState<any[] | null>(null),
    [historyVersion, setHistoryVersion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null),
    stageRef = useRef<HTMLDivElement>(null),
    manualZoom = useRef(false),
    undo = useRef<any[]>([]),
    redo = useRef<any[]>([]),
    requestId = useRef(0),
    current = useRef(value);
  current.current = value;
  function fitCanvas() {
    const stage = stageRef.current;
    if (!stage) return;
    const size = current.current.layout;
    const ratio = Math.min(
      (stage.clientWidth - 80) / ((size.widthMm * 96) / 25.4),
      (stage.clientHeight - 80) / ((size.heightMm * 96) / 25.4),
    );
    setZoom(Math.max(10, Math.min(150, Math.floor(ratio * 100))));
  }
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (!manualZoom.current) fitCanvas();
    });
    if (stageRef.current) observer.observe(stageRef.current);
    if (!manualZoom.current) fitCanvas();
    return () => observer.disconnect();
  }, [value.layout.widthMm, value.layout.heightMm]);
  const source =
      value.panels.find((p: any) => p.id === selected) || value.panels[0],
    sameCount = source
      ? value.panels.filter(
          (p: any) => p.project.recipeId === source.project.recipeId,
        ).length - 1
      : 0;
  function commit(next: any) {
    undo.current.push(structuredClone(value));
    undo.current = undo.current.slice(-20);
    redo.current = [];
    onChange(next);
    setHistoryVersion((v) => v + 1);
    setError("");
    setStatus("");
  }
  function travel(back: boolean) {
    const from = back ? undo : redo,
      to = back ? redo : undo;
    if (!from.current.length) return;
    to.current.push(structuredClone(value));
    onChange(from.current.pop());
    setHistoryVersion((v) => v + 1);
  }
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (value.panels.length)
          download(
            new Blob([JSON.stringify(value, null, 2)], {
              type: "application/json",
            }),
            value.name + ".composition.json",
          );
      }
      const typing = (e.target as HTMLElement)?.closest(
        "input,textarea,select,[contenteditable=true]",
      );
      if (!typing && e.key.toLowerCase() === "z") {
        e.preventDefault();
        travel(!e.shiftKey);
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [value]);
  async function task(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError("");
    setStatus("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const serialized = JSON.stringify(value);
  useEffect(() => {
    const id = ++requestId.current;
    if (!value.panels.length) {
      setUrl("");
      setUpdating(false);
      return;
    }
    setUpdating(true);
    const timer = setTimeout(() => {
      api("/api/composition/render", { composition: value, format: "svg" })
        .then((r) => {
          if (id === requestId.current) {
            setUrl(r.url);
            setError("");
          }
        })
        .catch((e) => {
          if (id === requestId.current) setError(e.message);
        })
        .finally(() => {
          if (id === requestId.current) setUpdating(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      requestId.current++;
    };
  }, [serialized]);
  function layout(key: string, next: any) {
    commit({ ...value, layout: { ...value.layout, [key]: next } });
  }
  function move(index: number, delta: number) {
    const panels = [...value.panels];
    [panels[index], panels[index + delta]] = [
      panels[index + delta],
      panels[index],
    ];
    commit({ ...value, panels });
  }
  function numberControl(
    key: string,
    zh: string,
    english: string,
    min: number,
    max: number,
    step = 1,
  ) {
    return (
      <label>
        {en ? english : zh}
        <input
          type="number"
          aria-label={en ? english : zh}
          min={min}
          max={max}
          step={step}
          value={value.layout[key]}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            if (Number.isFinite(n) && n >= min && n <= max) layout(key, n);
          }}
        />
      </label>
    );
  }
  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    const selectedFiles = Array.from(files);
    await task(en ? "Importing" : "正在导入", async () => {
      let next = structuredClone(value);
      for (const f of selectedFiles) {
        if (f.size > 24 * 1024 * 1024)
          throw new Error(en ? "File exceeds 24 MB" : "文件超过 24 MB");
        const data = JSON.parse(await f.text());
        if (data.kind === "figure-composition") {
          if (selectedFiles.length !== 1)
            throw new Error(
              en
                ? "Open one composition at a time"
                : "每次只能打开一个组图文件",
            );
          next = await api("/api/composition/validate", data);
        } else next = addPanel(next, data, crypto.randomUUID());
      }
      next = await api("/api/composition/validate", next);
      commit(next);
    });
  }
  return (
    <main id="main-content" tabIndex={-1} className="composition-page">
      <div className="composition-heading">
        <div>
          <h1>{en ? "Compose figures" : "组图工作台"}</h1>
          <input
            aria-label={en ? "Composition name" : "组图名称"}
            value={value.name}
            maxLength={120}
            onChange={(e) =>
              commit({ ...value, name: e.target.value || "Figure composition" })
            }
          />
        </div>
        <div className="home-actions">
          <button
            className="secondary"
            onClick={() => travel(true)}
            disabled={!undo.current.length}
            aria-label={en ? "Undo composition change" : "撤销组图修改"}
          >
            <Undo2 size={17} />
          </button>
          <button
            className="secondary"
            onClick={() => travel(false)}
            disabled={!redo.current.length}
            aria-label={en ? "Redo composition change" : "重做组图修改"}
          >
            <Redo2 size={17} />
          </button>
          <button
            className="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={!!busy}
          >
            <Upload size={16} />
            {en ? "Open / add files" : "打开 / 添加文件"}
          </button>
          <button
            className="primary"
            disabled={!!busy || value.panels.length >= 12}
            onClick={onAddCurrent}
          >
            <Plus size={17} />
            {en ? "Add current figure" : "添加当前图形"}
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        multiple
        hidden
        onChange={(e) => {
          importFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {(error || status) && (
        <p
          className={error ? "composition-error" : "composition-status"}
          role={error ? "alert" : "status"}
        >
          {error || status}
        </p>
      )}
      <div className="composition-layout">
        <aside className="composition-inspector">
          <section>
            <h2>
              {en ? "Panels" : "子图"} <small>{value.panels.length}/12</small>
            </h2>
            {value.panels.map((p: any, i: number) => (
              <div
                key={p.id}
                className={"panel-row " + (source?.id === p.id ? "active" : "")}
              >
                <button
                  className="panel-select"
                  aria-pressed={source?.id === p.id}
                  onClick={() => setSelected(p.id)}
                >
                  <b>{String.fromCharCode(65 + i)}</b>
                  <span>
                    <strong>{p.project.name}</strong>
                    <small>
                      {chartNumber(p.project.recipeId)} ·{" "}
                      {
                        catalog.find((r: any) => r.id === p.project.recipeId)
                          ?.name
                      }
                    </small>
                  </span>
                </button>
                <div className="panel-tools">
                  <button
                    onClick={() => onEdit(p.id)}
                    aria-label={
                      (en ? "Edit panel " : "编辑子图 ") +
                      String.fromCharCode(65 + i)
                    }
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={
                      (en ? "Move up panel " : "上移子图 ") +
                      String.fromCharCode(65 + i)
                    }
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    disabled={i === value.panels.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={
                      (en ? "Move down panel " : "下移子图 ") +
                      String.fromCharCode(65 + i)
                    }
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    onClick={() =>
                      commit({
                        ...value,
                        panels: value.panels.filter((q: any) => q.id !== p.id),
                      })
                    }
                    aria-label={
                      (en ? "Remove panel " : "移除子图 ") +
                      String.fromCharCode(65 + i)
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            ))}
            <button
              className="secondary wide"
              disabled={!!busy}
              onClick={() =>
                task(en ? "Loading projects" : "读取已保存图形", async () =>
                  setSaved(await api("/api/projects")),
                )
              }
            >
              {en ? "Add saved figure" : "添加已保存图形"}
            </button>
            {saved && (
              <div className="saved-panel-list">
                {!saved.length ? (
                  <p>{en ? "No saved figures yet." : "暂无已保存图形。"}</p>
                ) : (
                  saved.map((p) => (
                    <button
                      key={p.id}
                      disabled={value.panels.length >= 12}
                      onClick={() =>
                        task(en ? "Adding" : "添加图形", async () => {
                          commit(
                            addPanel(
                              value,
                              await api("/api/projects/" + p.id),
                              crypto.randomUUID(),
                            ),
                          );
                          setSaved(null);
                        })
                      }
                    >
                      {p.name}
                      <Plus size={15} />
                    </button>
                  ))
                )}
              </div>
            )}
          </section>
          {source && (
            <section>
              <h2>
                <SlidersHorizontal size={17} />
                {en ? "Match chart settings" : "统一同图型参数"}
              </h2>
              <p>
                {en ? "Reference" : "参考"}：
                {String.fromCharCode(65 + value.panels.indexOf(source))} ·{" "}
                {
                  catalog.find((r: any) => r.id === source.project.recipeId)
                    ?.name
                }
              </p>
              <label className="composition-check">
                <input
                  type="checkbox"
                  checked={includeAnalysis}
                  onChange={(e) => setIncludeAnalysis(e.target.checked)}
                />
                {en
                  ? "Include statistics and axis ranges"
                  : "同时同步统计设置与坐标范围"}
              </label>
              <p className="helper">
                {en
                  ? "Keeps each panel’s data, column mapping and labels. Colors match by group name."
                  : "保留各图数据、字段对应和标签；相同分组名称同步颜色。"}
              </p>
              <button
                className="secondary wide"
                disabled={!sameCount}
                onClick={() => {
                  commit(syncPanelSettings(value, source.id, includeAnalysis));
                  setStatus(
                    en
                      ? `Updated ${sameCount} matching panels`
                      : `已统一 ${sameCount} 张同图型子图`,
                  );
                }}
              >
                {en ? "Apply to matching panels" : "应用到同图型子图"} (
                {sameCount})
              </button>
            </section>
          )}
          <section>
            <h2>{en ? "Layout" : "排列与画布"}</h2>
            <div className="composition-fields">
              {numberControl("columns", "每行子图数", "Columns", 1, 4)}
              {numberControl(
                "gapMm",
                "子图间距（毫米）",
                "Gap (mm)",
                0,
                30,
                0.5,
              )}
              {numberControl(
                "widthMm",
                "组图宽度（毫米）",
                "Sheet width (mm)",
                100,
                600,
              )}
              {numberControl(
                "heightMm",
                "组图高度（毫米）",
                "Sheet height (mm)",
                80,
                600,
              )}
              {numberControl(
                "marginMm",
                "外侧留白（毫米）",
                "Outer margin (mm)",
                0,
                30,
                0.5,
              )}
              <label>
                {en ? "Background" : "背景色"}
                <input
                  type="color"
                  aria-label={en ? "Composition background" : "组图背景色"}
                  value={value.layout.background}
                  onChange={(e) => layout("background", e.target.value)}
                />
              </label>
            </div>
            <label className="composition-check">
              <input
                type="checkbox"
                checked={value.layout.labels}
                onChange={(e) => layout("labels", e.target.checked)}
              />
              {en ? "Panel labels A, B, C…" : "子图标签 A、B、C…"}
            </label>
            {value.layout.labels &&
              numberControl(
                "labelSize",
                "子图标签字号",
                "Panel label size",
                6,
                30,
              )}
            <label className="composition-check">
              <input
                type="checkbox"
                checked={value.layout.alignPanels}
                onChange={(e) => layout("alignPanels", e.target.checked)}
              />
              {en
                ? "Align compatible plot widths"
                : "对齐可兼容子图的绘图区宽度"}
            </label>
          </section>
          <section>
            <h2>{en ? "Export" : "导出组图"}</h2>
            <div className="composition-fields">
              <label>
                {en ? "Format" : "格式"}
                <select
                  aria-label={en ? "Composition format" : "组图导出格式"}
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  {["pdf", "svg", "png", "tiff"].map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
              <label>
                {en ? "Resolution" : "分辨率"}
                <select
                  aria-label={en ? "Composition resolution" : "组图分辨率"}
                  value={value.layout.dpi}
                  onChange={(e) => layout("dpi", Number(e.target.value))}
                >
                  {[150, 300, 600].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              className="primary wide"
              disabled={!value.panels.length || !!busy || !connected}
              onClick={() =>
                task(en ? "Exporting" : "正在导出组图", async () => {
                  const r = await api("/api/composition/render", {
                    composition: current.current,
                    format,
                  });
                  download(await api(r.url), value.name + "." + format);
                })
              }
            >
              <Download size={16} />
              {busy || (en ? "Export composition" : "导出组图")}
            </button>
            <button
              className="secondary wide"
              disabled={!value.panels.length || !!busy || !connected}
              onClick={() =>
                task(en ? "Preparing R source" : "准备 R 源码", async () =>
                  download(
                    await api("/api/r-source", { project: current.current }),
                    value.name + ".R",
                  ),
                )
              }
            >
              {en ? "Download R source" : "下载 R 源码"}
            </button>
            <button
              className="secondary wide"
              disabled={!value.panels.length}
              onClick={() =>
                download(
                  new Blob([JSON.stringify(value, null, 2)], {
                    type: "application/json",
                  }),
                  value.name + ".composition.json",
                )
              }
            >
              {en ? "Save editable composition" : "保存可编辑组图"}
            </button>
          </section>
        </aside>
        <section
          className="composition-stage"
          aria-label={en ? "Composition canvas" : "组图画布"}
        >
          <div className="composition-stage-tools">
            <span role="status">
              {updating
                ? en
                  ? "Updating"
                  : "正在更新"
                : en
                  ? "Preview"
                  : "组图预览"}
            </span>
            <label>
              {en ? "Zoom" : "缩放"}
              <input
                aria-label={en ? "Composition zoom" : "组图缩放"}
                type="range"
                min="10"
                max="150"
                step="1"
                value={zoom}
                onChange={(e) => {
                  manualZoom.current = true;
                  setZoom(Number(e.target.value));
                }}
              />
              {zoom}%
            </label>
            <button
              className="secondary"
              onClick={() => {
                manualZoom.current = false;
                fitCanvas();
              }}
            >
              {en ? "Fit" : "适合窗口"}
            </button>
          </div>
          <div className="composition-scroll" ref={stageRef}>
            {url && value.panels.length ? (
              <img
                style={{
                  width: `${(((value.layout.widthMm * 96) / 25.4) * zoom) / 100}px`,
                }}
                src={url}
                alt={en ? "Composed scientific figure" : "组图精确预览"}
              />
            ) : (
              <div className="composition-empty">
                <PanelsTopLeft size={40} />
                <h2>
                  {en
                    ? "Build your figure, panel by panel"
                    : "把独立图形组合成一张图"}
                </h2>
                <p>
                  {en
                    ? "Add the current figure, saved projects or .figure.json files."
                    : "添加当前图形、已保存图形，或导入 .figure.json 文件。"}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
