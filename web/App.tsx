import { BRAND } from "./brand";
import { DataImport, InputGuide } from "./DataImport";
import "./import.css";
import { tx, useLocale, localizeRecipe, localizeSpec } from "./i18n";
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  ScatterChart,
  Upload,
  Download,
  ChevronRight,
  ChevronDown,
  Undo2,
  Redo2,
  Check,
  FolderOpen,
  Save,
  Search,
  SlidersHorizontal,
  Table2,
  Type,
  HelpCircle,
  X,
  Plus,
  Minus,
  Maximize2,
  History,
  Palette,
  ArrowRight,
  LoaderCircle,
  AlertCircle,
  FileSpreadsheet,
  Leaf,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  Copy,
  Star,
  PanelsTopLeft,
  Library,
  Database,
  Home,
  WifiOff,
  Focus,
  PanelRightClose,
  CheckCircle2,
  Circle,
  Ruler,
  ChevronLeft,
} from "lucide-react";
import {
  initSession,
  api,
  render,
  download,
  saveDraft,
  loadDraft,
} from "./api";
import { raincloudIds } from "../shared/raincloud.mjs";
import { activeParams, PALETTE } from "../shared/catalog.mjs";
import { reconcileColors } from "../shared/colors.mjs";
import {
  applyPalette,
  PALETTES,
  paletteAvailability,
} from "../shared/palettes.mjs";
import { PaletteQuick, PalettePicker } from "./PalettePicker";
import { HomePage } from "./HomePage";
import { Composition } from "./Composition";
import { HOME_RECIPES, resolveHomeSelection } from "../shared/home.mjs";
import { emptyComposition, addPanel } from "../shared/composition.mjs";
import "./workspace.css";
import { LiveFigure } from "./LiveFigure";
import { latestPreviewQueue } from "./preview-queue.mjs";
import {
  filterRecipes,
  newRecipeIds,
  DATA_SHAPES,
  dataShape,
  recentRecipes,
} from "../shared/library.mjs";
import { StudioLibrary } from "./StudioLibrary";
import "./style.css";
import "./atlas.css";
const clone = (p: any) => structuredClone(p);
function readLibraryList(key: string) {
  try {
    const a = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(a)
      ? a.filter((v) => typeof v === "string").slice(0, 100)
      : [];
  } catch {
    return [];
  }
}
function App() {
  const [locale, setLocale] = useLocale();
  const [project, setProject] = useState<any>(null),
    [rawCatalog, setCatalog] = useState<any[]>([]),
    [rawSpecs, setSpecs] = useState<any>({}),
    [runtime, setRuntime] = useState<any>({});
  const catalog = rawCatalog.map(localizeRecipe);
  const specs = Object.fromEntries(
    Object.entries(rawSpecs).map(([k, v]) => [k, localizeSpec(k, v)]),
  );
  const [page, setPageState] = useState(() =>
      ["home", "editor", "library", "data", "composition"].includes(
        location.hash.slice(1),
      )
        ? location.hash.slice(1)
        : "home",
    ),
    [tab, setTab] = useState("style"),
    [selected, setSelected] = useState("violin"),
    [query, setQuery] = useState(""),
    [family, setFamily] = useState("全部");
  const [libraryScope, setLibraryScope] = useState("all"),
    [dataShapeFilter, setDataShapeFilter] = useState("all"),
    [favorites, setFavorites] = useState<string[]>(() =>
      readLibraryList("figure-favorites"),
    ),
    [recent, setRecent] = useState<string[]>(() =>
      readLibraryList("figure-recent"),
    );
  const [featured, setFeatured] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("figure-home");
      return saved
        ? resolveHomeSelection(JSON.parse(saved))
        : [...HOME_RECIPES];
    } catch {
      return [...HOME_RECIPES];
    }
  });
  const [composition, setComposition] = useState<any>(emptyComposition),
    [compositionReady, setCompositionReady] = useState(false),
    [panelTarget, setPanelTarget] = useState<string | null>(null);
  useEffect(() => {
    loadDraft("composition")
      .then((c) => {
        if (c?.kind === "figure-composition") setComposition(c);
      })
      .catch(() => {})
      .finally(() => setCompositionReady(true));
  }, []);
  useEffect(() => {
    if (compositionReady)
      saveDraft(composition, "composition").catch(() =>
        setMessage(
          locale === "en"
            ? "Composition could not be autosaved; download the editable file."
            : "组图自动保存失败，请下载可编辑组图文件。",
        ),
      );
  }, [composition, compositionReady]);
  function addCurrentPanel() {
    try {
      setComposition(
        addPanel(composition, current.current, crypto.randomUUID()),
      );
      setPage("composition");
      setPanelTarget(null);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function updateCompositionPanel() {
    setComposition((c) => ({
      ...c,
      panels: c.panels.map((p: any) =>
        p.id === panelTarget ? { ...p, project: clone(current.current) } : p,
      ),
    }));
    setPanelTarget(null);
    setPage("composition");
  }
  const [preview, setPreview] = useState(""),
    [previewProject, setPreviewProject] = useState<any>(null),
    [metadata, setMetadata] = useState<any>(null),
    [rendering, setRendering] = useState(false),
    [renderError, setRenderError] = useState(""),
    [retry, setRetry] = useState(0);
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(""),
    [modal, setModal] = useState(""),
    [entries, setEntries] = useState<any[]>([]),
    [inspection, setInspection] = useState<any>(null);
  const [saveState, setSaveState] = useState(tx("正在载入")),
    [zoom, setZoom] = useState(1),
    [undoCount, setUndoCount] = useState(0),
    [redoCount, setRedoCount] = useState(0);
  const [format, setFormat] = useState("pdf"),
    [recs, setRecs] = useState<any>(null);
  const [styleName, setStyleName] = useState(tx("我的科研样式")),
    [wideId, setWideId] = useState(""),
    [wideCols, setWideCols] = useState<string[]>([]),
    [filterColumn, setFilterColumn] = useState(""),
    [filterValue, setFilterValue] = useState("");
  const [parameterQuery, setParameterQuery] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [connected, setConnected] = useState(true);
  const [bootstrapRetry, setBootstrapRetry] = useState(0);
  function setPage(next: string) {
    if (location.hash !== "#" + next) history.pushState(null, "", "#" + next);
    setPageState(next);
    setFocusMode(false);
  }
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title =
      ({
        home: tx("推荐绘图"),
        composition: tx("组图"),
        editor: tx("工作台"),
        library: tx("图表图谱"),
        data: tx("数据整理"),
      }[page] || tx("图表库")) +
      " · " +
      BRAND.name;
  }, [page, locale]);
  useEffect(() => {
    const restore = () =>
      setPageState(
        ["home", "editor", "library", "data", "composition"].includes(
          location.hash.slice(1),
        )
          ? location.hash.slice(1)
          : "home",
      );
    window.addEventListener("popstate", restore);
    window.addEventListener("hashchange", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("hashchange", restore);
    };
  }, []);
  useEffect(() => {
    const connection = (event: Event) =>
      setConnected((event as CustomEvent).detail);
    window.addEventListener("figure-connection", connection);
    const timer = setInterval(() => initSession().catch(() => {}), 15000);
    return () => {
      window.removeEventListener("figure-connection", connection);
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (connected && project) setRetry((v) => v + 1);
  }, [connected]);
  useEffect(() => {
    setParameterQuery("");
  }, [tab, project?.recipeId]);
  const projectFileRef = useRef<HTMLInputElement>(null),
    current = useRef<any>(null),
    generation = useRef(0),
    undo = useRef<any[]>([]),
    redo = useRef<any[]>([]),
    lastEdit = useRef({ label: "", time: 0 });
  const previewQueue = useRef<any>(null);
  const recipe = catalog.find((r) => r.id === project?.recipeId),
    chosen = catalog.find((r) => r.id === selected);
  const visibleRecipes = filterRecipes(catalog, {
    query,
    family,
    scope: libraryScope,
    shape: dataShapeFilter,
    favorites,
    recent,
  });
  useEffect(() => {
    if (project?.recipeId) setRecent((a) => recentRecipes(a, project.recipeId));
  }, [project?.recipeId]);
  useEffect(() => {
    try {
      localStorage.setItem("figure-favorites", JSON.stringify(favorites));
    } catch {}
  }, [favorites]);
  useEffect(() => {
    try {
      localStorage.setItem("figure-recent", JSON.stringify(recent));
    } catch {}
  }, [recent]);
  function clearLibraryFilters() {
    setQuery("");
    setFamily("全部");
    setDataShapeFilter("all");
    setLibraryScope("all");
  }
  useEffect(() => {
    (async () => {
      await initSession();
      const c = await api("/api/catalog");
      setCatalog(c.recipes);
      setSpecs(c.params);
      setRuntime(c.runtime);
      let draft = null;
      try {
        draft = await loadDraft();
      } catch {}
      const requested = new URLSearchParams(location.search).get("project");
      const saved = requested
        ? await api("/api/projects/" + encodeURIComponent(requested))
        : null;
      const validDraft =
        draft?.schemaVersion === 1 &&
        c.recipes.some((r: any) => r.id === draft.recipeId);
      const p = saved
        ? validDraft &&
          draft.id === saved.id &&
          draft.revision >= saved.revision
          ? draft
          : saved
        : validDraft
          ? draft
          : await api("/api/examples/violin");
      if (requested) setPage("editor");
      p.params = {
        ...Object.fromEntries(
          Object.entries(c.params).map(([k, v]: any) => [k, v.default]),
        ),
        ...p.params,
      };
      const normalized = reconcileColors(p);
      current.current = normalized;
      setProject(normalized);
      setSelected(p.recipeId);
      setSaveState(
        saved && p === saved
          ? tx("已打开智能体准备的项目")
          : validDraft
            ? tx("已恢复本机草稿")
            : tx("示例数据"),
      );
    })().catch((e) => setMessage(e.message));
  }, [bootstrapRetry]);
  useEffect(() => {
    current.current = project;
    if (!project) return;
    const t = setTimeout(
      () =>
        saveDraft(project)
          .then(() => setSaveState(tx("草稿已保存在本机")))
          .catch(() => setSaveState(tx("请手动保存项目"))),
      600,
    );
    return () => clearTimeout(t);
  }, [project]);
  useEffect(() => {
    previewQueue.current = latestPreviewQueue(
      (p: any) =>
        api("/api/preview", { project: { ...p, originalData: undefined } }),
      (job: any, p: any) => {
        setPreview(job.svg);
        setPreviewProject(p);
        setMetadata(job.metadata);
        setRenderError("");
      },
      setRendering,
      (e: any) => setRenderError(e.message),
    );
    return () => previewQueue.current.dispose();
  }, []);
  useEffect(() => {
    if (!project) return;
    setRenderError("");
    previewQueue.current.submit(
      project,
      JSON.stringify([project.recipeId, project.data, project.mapping]),
    );
  }, [project, retry]);
  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    const t = setTimeout(
      () =>
        api("/api/inspect", project)
          .then((r) => {
            if (!cancelled) {
              setInspection(r);
              setWideId((v) =>
                project.data.columns.includes(v) ? v : project.data.columns[0],
              );
            }
          })
          .catch(() => {}),
      300,
    );
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [project]);
  useEffect(() => {
    if (!message || !project) return;
    const t = setTimeout(() => setMessage(""), 7000);
    return () => clearTimeout(t);
  }, [message, !!project]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal("");
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);
  useEffect(() => {
    if (!modal) return;
    const before = document.activeElement as HTMLElement,
      dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const items = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]',
        ) || [],
      ).filter((e) => e.offsetParent !== null);
    items()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const a = items(),
        first = a[0],
        last = a[a.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    dialog?.addEventListener("keydown", trap);
    return () => {
      dialog?.removeEventListener("keydown", trap);
      document.body.style.overflow = previousOverflow;
      before?.focus();
    };
  }, [modal]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest(
        "input,textarea,select,[contenteditable=true]",
      );
      if (e.key === "Escape" && !modal) setFocusMode(false);
      if (page === "home" || page === "composition") return;
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "s" &&
        project &&
        !modal
      ) {
        e.preventDefault();
        if (!busy) saveProject();
      }
      if (modal || typing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        travel(e.shiftKey ? "redo" : "undo");
      }
      if (e.key === "/" && page === "library") {
        e.preventDefault();
        document.getElementById("chart-search")?.focus();
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [page, modal, busy, project]);
  function edit(fn: (p: any) => void, label = "change") {
    const p = current.current;
    if (!p) return;
    if (
      label !== lastEdit.current.label ||
      Date.now() - lastEdit.current.time > 900
    ) {
      undo.current.push(clone(p));
      if (undo.current.length > 30) undo.current.shift();
    }
    lastEdit.current = { label, time: Date.now() };
    redo.current = [];
    setUndoCount(undo.current.length);
    setRedoCount(0);
    const n = clone(p);
    fn(n);
    const normalized = reconcileColors(n);
    current.current = normalized;
    setProject(normalized);
    setSaveState(tx("有未保存的调整"));
  }
  function replace(p: any) {
    setPanelTarget(null);
    generation.current++;
    history.replaceState(null, "", location.pathname + location.hash);
    p = reconcileColors(p);
    undo.current = [];
    redo.current = [];
    setUndoCount(0);
    setRedoCount(0);
    current.current = p;
    setProject(p);
    setPreview("");
    setMetadata(null);
    setInspection(null);
    setSelected(p.recipeId);
    lastEdit.current = { label: "", time: 0 };
  }
  function travel(direction: string) {
    const from = direction === "undo" ? undo.current : redo.current,
      to = direction === "undo" ? redo.current : undo.current;
    if (!from.length) return;
    to.push(clone(current.current));
    const p = from.pop();
    p.id = current.current.id;
    p.revision = current.current.revision;
    current.current = p;
    setProject(p);
    setUndoCount(undo.current.length);
    setRedoCount(redo.current.length);
    lastEdit.current = { label: "", time: 0 };
  }
  async function task(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy("");
    }
  }
  async function useExample(id: string) {
    setPanelTarget(null);
    await task(tx("正在打开示例"), async () => {
      replace(await api("/api/examples/" + id));
      setZoom(1);
      setPage("editor");
    });
  }
  async function useMyData(id: string) {
    await task(tx("正在准备数据"), async () => {
      const n = clone(current.current);
      n.recipeId = id;
      for (const key of ["xMin", "xMax", "yMin", "yMax"]) n.params[key] = null;
      const info = await api("/api/inspect", n);
      n.mapping = info.mapping;
      edit((p) => Object.assign(p, n), "chart");
      setPage("data");
    });
  }
  async function applyImport(res: any, file: File) {
    const previous = current.current;
    const p = clone(current.current);
    p.data = res.data;
    p.originalData = clone(res.data);
    if (p.data.source) delete p.data.source.base64;
    p.transforms = [];
    p.name = file.name.replace(/\.[^.]+$/, "");
    p.labels = { title: "", x: "", y: "", note: "" };
    for (const key of ["xMin", "xMax", "yMin", "yMax"]) p.params[key] = null;
    p.context = "";
    p.mapping = {};
    p.id = null;
    p.revision = 0;
    const info = await api("/api/inspect", p);
    if (current.current !== previous)
      throw new Error(tx("当前项目已变化，请重新确认导入"));
    p.mapping = info.mapping;
    // A newly imported dataset starts a fresh color history, keeping identities
    // that really occur in both datasets and the chosen palette for new groups.
    const importedGroups = reconcileColors({
      ...p,
      colors: {},
      groupOrder: [],
    }).groupOrder;
    p.colors = Object.fromEntries(
      Object.entries(p.colors).filter(([name]) =>
        importedGroups.includes(name),
      ),
    );
    const previousPanelTarget = panelTarget;
    replace(p);
    setPanelTarget(previousPanelTarget);
    setInspection(info);
    setPage("data");
    setModal("");
  }
  async function saveProject() {
    await task(tx("正在保存项目"), async () => {
      const before = current.current,
        opened = generation.current;
      const p = await api("/api/projects", before);
      if (opened !== generation.current) return;
      const edited = current.current !== before;
      const next = edited
        ? { ...current.current, id: p.id, revision: p.revision }
        : p;
      current.current = next;
      setProject(next);
      setSaveState(
        edited
          ? tx("较早版本已保存，最新调整仍在草稿中")
          : tx("已保存为版本 ") + p.revision,
      );
      setMessage(
        edited
          ? tx("保存期间的新调整已保留，请再次保存以建立新版本。")
          : tx("项目已保存，可以关闭网页后继续编辑。"),
      );
    });
  }
  async function openList(which: string) {
    await task(tx("正在读取"), async () => {
      setEntries(await api("/api/" + which));
      setModal(which);
    });
  }
  async function openHistory() {
    if (!project.id) {
      setMessage(tx("先保存一次项目，即可建立版本记录。"));
      return;
    }
    await task(tx("正在读取版本"), async () => {
      setEntries(await api("/api/projects/" + project.id + "/history"));
      setModal("history");
    });
  }
  async function exportFigure() {
    await task(tx("正在导出 ") + format.toUpperCase(), async () => {
      const snapshot = clone(current.current),
        job = await render(snapshot, format);
      const r = await fetch(job.url + "?download=1");
      if (!r.ok) throw new Error(tx("下载失败"));
      download(await r.blob(), snapshot.name + "." + format);
      setMessage(tx("已导出") + " " + format.toUpperCase());
    });
  }
  async function projectJSON() {
    download(
      new Blob([JSON.stringify(current.current, null, 2)], {
        type: "application/json",
      }),
      project.name + ".figure.json",
    );
  }
  async function changeData(action: any) {
    await task(tx("正在整理数据"), async () => {
      const result = await api("/api/transform", {
        project: current.current,
        action,
      });
      edit((p) => Object.assign(p, result), "transform");
    });
  }
  async function suggest() {
    await task(tx("正在检查数据"), async () => {
      setRecs(await api("/api/recommend", current.current));
      setModal("recommend");
    });
  }
  const setParam = (key: string, value: any) =>
    edit((p) => {
      p.params[key] = value;
    }, "param:" + key);
  const fieldLabel = (key: string, value: string) =>
    edit((p) => {
      p.labels[key] = value;
    }, "label:" + key);
  const fontLabel = (name: string) =>
    ({
      SimSun: tx("宋体"),
      "Microsoft YaHei": tx("微软雅黑"),
      "Noto Serif CJK SC": tx("思源宋体"),
      "Noto Sans CJK SC": tx("思源黑体"),
      "Times New Roman": tx("新罗马"),
    })[name] || name;
  function control(key: string, scope = "main") {
    const s = specs[key];
    if (!s || !project) return null;
    const v = project.params[key],
      id = "control-" + scope + "-" + key;
    return (
      <div
        className={"control " + (s.type === "boolean" ? "inline" : "")}
        key={key}
      >
        <label htmlFor={id}>{s.label}</label>
        {s.type === "range" ? (
          <div className="range-row">
            <input
              id={id}
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={v}
              onChange={(e) => setParam(key, +e.target.value)}
            />
            <input
              aria-label={s.label + tx("精确数值")}
              type="number"
              min={s.min}
              max={s.max}
              step={s.step}
              value={v}
              onChange={(e) => {
                if (
                  e.target.value !== "" &&
                  +e.target.value >= s.min &&
                  +e.target.value <= s.max
                )
                  setParam(key, +e.target.value);
              }}
            />
            <button
              className="icon-button reset"
              title={tx("重置") + s.label}
              onClick={() => setParam(key, s.default)}
            >
              <RefreshCw size={13} />
            </button>
          </div>
        ) : s.type === "boolean" ? (
          <input
            id={id}
            role="switch"
            className="switch"
            type="checkbox"
            checked={v}
            onChange={(e) => setParam(key, e.target.checked)}
          />
        ) : s.type === "select" ? (
          <select
            id={id}
            value={v}
            onChange={(e) => setParam(key, e.target.value)}
          >
            {Object.entries(s.options).map(([value, label]: any) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : s.type === "font" ? (
          <select
            id={id}
            value={v}
            onChange={(e) => setParam(key, e.target.value)}
          >
            {(runtime.fonts || [v]).map((f: string) => (
              <option key={f} value={f}>
                {fontLabel(f)}
              </option>
            ))}
          </select>
        ) : s.type === "color" ? (
          <div className="color-row">
            <input
              id={id}
              type="color"
              value={v}
              onChange={(e) => setParam(key, e.target.value)}
            />
            <span>{v}</span>
          </div>
        ) : s.type === "optionalNumber" ? (
          <input
            id={id}
            type="number"
            min={s.min}
            max={s.max}
            step="any"
            placeholder={tx("自动")}
            value={v ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "") setParam(key, null);
              else if (
                Number.isFinite(+value) &&
                +value >= s.min &&
                +value <= s.max
              )
                setParam(key, +value);
            }}
          />
        ) : (
          <input
            id={id}
            type="number"
            min={s.min}
            max={s.max}
            step={s.step}
            value={v}
            onChange={(e) => {
              if (
                e.target.value !== "" &&
                +e.target.value >= s.min &&
                +e.target.value <= s.max
              )
                setParam(key, +e.target.value);
            }}
          />
        )}
        {s.hint && <small>{s.hint}</small>}
      </div>
    );
  }
  function mappedFields() {
    return (
      <>
        {recipe?.roles.map((r: any) => (
          <div className="control" key={r.id}>
            <label htmlFor={"map-" + r.id}>{r.label}</label>
            {r.type === "multi" ? (
              <div className="check-list">
                {inspection?.profile
                  .filter((c: any) => c.type === "number")
                  .map((c: any) => (
                    <label key={c.name}>
                      <input
                        type="checkbox"
                        checked={(project.mapping[r.id] || []).includes(c.name)}
                        onChange={(e) =>
                          edit((p) => {
                            const old = p.mapping[r.id] || [];
                            p.mapping[r.id] = e.target.checked
                              ? [...old, c.name]
                              : old.filter((x: string) => x !== c.name);
                          }, "mapping:" + r.id)
                        }
                      />
                      {c.name}
                    </label>
                  ))}
              </div>
            ) : (
              <select
                id={"map-" + r.id}
                value={project.mapping[r.id] || ""}
                onChange={(e) =>
                  edit((p) => {
                    p.mapping[r.id] = e.target.value;
                  }, "mapping:" + r.id)
                }
              >
                <option value="">
                  {r.required ? tx("请选择一列") : tx("不使用")}
                </option>
                {project.data.columns.map((c: string) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </>
    );
  }
  function previewArea(compact = false) {
    return (
      <div className={"preview-shell " + (compact ? "compact" : "")}>
        <div
          className={"preview-paper " + (rendering ? "updating" : "")}
          style={
            {
              "--figure-ratio":
                project.params.widthMm / project.params.heightMm,
            } as React.CSSProperties
          }
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              setZoom((z) =>
                Math.max(0.25, Math.min(3, z + (e.deltaY < 0 ? 0.1 : -0.1))),
              );
            }
          }}
        >
          {preview ? (
            <LiveFigure
              svg={preview}
              before={previewProject}
              project={project}
              metadata={metadata}
              zoom={compact ? 1 : zoom}
            />
          ) : (
            <div className="empty-preview">
              {rendering ? (
                <LoaderCircle className="spin" size={32} />
              ) : (
                <ScatterChart size={42} />
              )}
              <p>
                {rendering
                  ? tx("正在绘制你的图形")
                  : tx("准备好数据后，这里会显示图形")}
              </p>
            </div>
          )}
        </div>
        {rendering && (
          <span className="render-badge">
            <LoaderCircle size={14} className="spin" />
            {preview ? tx("正在同步精确图形") : tx("正在绘制图形")}
          </span>
        )}
        {renderError && (
          <div className="render-error" role="alert">
            <AlertCircle size={18} />
            <div>
              <strong>{tx("需要调整数据或设置")}</strong>
              <p>{tx(renderError)}</p>
              <button onClick={() => setPage("data")}>{tx("检查数据")}</button>
              <button onClick={() => setRetry((v) => v + 1)}>
                {tx("重新绘制")}
              </button>
            </div>
          </div>
        )}
        {!compact && (
          <div className="canvas-toolbar">
            <div className="zoom-controls">
              <button title={tx("适合窗口")} onClick={() => setZoom(1)}>
                <Maximize2 size={15} />
                {tx("适合窗口")}
              </button>
              <button
                aria-label={tx("缩小")}
                onClick={() => setZoom((v) => Math.max(0.25, v - 0.1))}
              >
                <Minus size={14} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                aria-label={tx("放大")}
                onClick={() => setZoom((v) => Math.min(3, v + 0.1))}
              >
                <Plus size={14} />
              </button>
            </div>
            <span>
              {inspection?.check.usedRows ?? project.data.rows.length}{" "}
              {tx("条有效观测")}
              {project.data.synthetic ? tx(" · 模拟数据") : ""}
            </span>
          </div>
        )}
      </div>
    );
  }
  if (!project)
    return (
      <main className="loading">
        <ScatterChart size={44} />
        <h1>{tx("科研绘图")}</h1>
        <p>{message || tx("正在恢复你的本机工作台…")}</p>
        {message && (
          <>
            <p className="helper">
              {tx(
                "如果服务已停止，请双击项目中的「启动科研绘图.cmd」，再点击重试。草稿保存在本机。",
              )}
            </p>
            <button
              className="primary"
              onClick={() => {
                setMessage("");
                setBootstrapRetry((v) => v + 1);
              }}
            >
              {tx("重新连接")}
            </button>
          </>
        )}
      </main>
    );
  const active = activeParams(project.recipeId),
    groups = project.groupOrder;
  const families = ["全部", ...new Set(catalog.map((r) => r.family))];
  return (
    <div className={"studio-app page-" + page}>
      <input
        ref={projectFileRef}
        type="file"
        accept=".json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f)
            task(tx("正在打开项目文件"), async () => {
              const raw = JSON.parse(await f.text());
              raw.id = null;
              raw.revision = 0;
              const info = await api("/api/inspect", raw);
              replace(info.project);
              setModal("");
              setPage("editor");
            });
          e.target.value = "";
        }}
      />
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        {tx("跳到主要内容")}
      </a>
      <aside className="app-rail" aria-label={tx("主导航")}>
        <button
          className="brand"
          aria-label={tx("主页")}
          onClick={() => setPage("home")}
        >
          <ScatterChart size={28} />
        </button>
        <div className="rail-label">{tx("科研绘图")}</div>
        <nav>
          {[
            ["home", tx("主页"), Home],
            ["library", tx("图表库"), Library],
            ["editor", tx("工作台"), PanelsTopLeft],
            ["data", tx("数据"), Database],
            ["composition", tx("组图"), PanelsTopLeft],
          ].map(([key, label, Icon]: any) => (
            <button
              key={key}
              aria-label={label}
              aria-current={page === key ? "page" : undefined}
              className={page === key ? "active" : ""}
              onClick={() => setPage(key)}
            >
              <Icon size={21} />
              <span>{label}</span>
            </button>
          ))}
          <div className="rail-separator" />
          <button onClick={() => openList("projects")}>
            <FolderOpen size={21} />
            <span>{tx("我的项目")}</span>
          </button>
          <button onClick={() => openList("styles")}>
            <Palette size={21} />
            <span>{tx("我的样式")}</span>
          </button>
        </nav>
        <div className="rail-bottom">
          <button onClick={() => setModal("agent")}>
            <Sparkles size={20} />
            <span>{tx("智能体")}</span>
          </button>
          <button onClick={() => setModal("help")}>
            <HelpCircle size={20} />
            <span>{tx("帮助")}</span>
          </button>
        </div>
      </aside>
      <div className="app-content">
        <header className="projectbar">
          <div className="project-identity">
            <button className="app-name" onClick={() => setPage("home")}>
              {BRAND.name}
            </button>
            <div className="project-subline">
              <span
                className={"connection-dot " + (!connected ? "offline" : "")}
              />
              <span>{connected ? tx("本地运行") : tx("本地服务已断开")}</span>
            </div>
          </div>
          <div className="project-actions">
            <button
              className="locale-toggle"
              aria-label={tx("界面语言 / Interface language")}
              onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
            >
              <span className={locale === "zh" ? "active" : ""}>
                {tx("中")}
              </span>
              <span className={locale === "en" ? "active" : ""}>EN</span>
            </button>
            {page === "editor" && (
              <button
                className="secondary"
                disabled={
                  !!busy ||
                  !!renderError ||
                  (composition.panels.length >= 12 && !panelTarget)
                }
                onClick={panelTarget ? updateCompositionPanel : addCurrentPanel}
              >
                <PanelsTopLeft size={16} />
                {panelTarget ? tx("更新组图子图") : tx("加入组图")}
              </button>
            )}
            <div className="history-actions">
              <button
                className="icon-button"
                aria-label={tx("撤销")}
                title={tx("撤销 Ctrl+Z")}
                disabled={!undoCount}
                onClick={() => travel("undo")}
              >
                <Undo2 size={18} />
              </button>
              <button
                className="icon-button"
                aria-label={tx("重做")}
                title={tx("重做 Ctrl+Shift+Z")}
                disabled={!redoCount}
                onClick={() => travel("redo")}
              >
                <Redo2 size={18} />
              </button>
            </div>
            <button
              className="secondary save-action"
              aria-label={tx("保存项目")}
              disabled={!!busy || !connected}
              onClick={saveProject}
            >
              <Save size={16} />
              <span>{tx("保存项目")}</span>
            </button>
            <button
              className="primary"
              disabled={!!busy}
              onClick={() => setModal("export")}
            >
              <Download size={16} />
              <span>{tx("导出图形")}</span>
            </button>
          </div>
        </header>
        {!connected && (
          <div className="connection-banner" role="alert">
            <WifiOff size={20} />
            <div>
              <strong>{tx("本地绘图服务已停止")}</strong>
              <p>
                {tx("双击「启动科研绘图.cmd」后可继续。当前草稿仍保存在本机。")}
              </p>
            </div>
            <button
              className="secondary"
              disabled={!!busy}
              onClick={() =>
                task(tx("正在重新连接"), async () => {
                  await initSession();
                  setRuntime(await api("/api/health"));
                  setConnected(true);
                  setRetry((v) => v + 1);
                })
              }
            >
              {tx("重新连接")}
            </button>
            <button className="text-button" onClick={projectJSON}>
              {tx("备份当前项目")}
            </button>
          </div>
        )}
        {!runtime.ready && (
          <div className="banner danger">
            <AlertCircle size={18} />
            {tx("R 环境尚未就绪。请运行项目中的“首次安装”。")}
            <button
              onClick={() =>
                task(tx("检查运行环境"), async () => {
                  setRuntime(await api("/api/health"));
                  setRetry((v) => v + 1);
                })
              }
            >
              {tx("重新检查")}
            </button>
          </div>
        )}
        {page === "editor" && (
          <main
            id="main-content"
            tabIndex={-1}
            className={"workspace " + (focusMode ? "focus-mode" : "")}
          >
            <aside className="context-panel" aria-label={tx("当前图形与数据")}>
              <div className="context-heading">
                <span>{tx("当前图形")}</span>
                <button
                  className="small-link"
                  onClick={() => {
                    setSelected(project.recipeId);
                    setPage("library");
                  }}
                >
                  {tx("更换")}
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="current-template">
                <img
                  src={"/thumbnails/" + project.recipeId + ".svg"}
                  alt={recipe?.name + tx("模板")}
                />
                <h2>{recipe?.name}</h2>
                <span>{recipe?.family}</span>
              </div>
              <div className="context-heading">
                <span>{tx("数据来源")}</span>
                <Database size={15} />
              </div>
              <button
                className="dataset-card"
                title={project.data.name}
                onClick={() => setPage("data")}
              >
                <FileSpreadsheet size={20} />
                <span>
                  <strong>{project.data.name}</strong>
                  <small>
                    {project.data.rows.length} {tx("行 /")}{" "}
                    {project.data.columns.length} {tx("列")}
                  </small>
                </span>
                <ChevronRight size={14} />
              </button>
              <div
                className={
                  "data-readiness " +
                  (!inspection
                    ? "checking"
                    : inspection.check.ok
                      ? "ready"
                      : "")
                }
              >
                {!inspection ? (
                  <LoaderCircle size={14} className="spin" />
                ) : inspection.check.ok ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <AlertCircle size={14} />
                )}
                <span>
                  {!inspection
                    ? tx("正在检查数据")
                    : inspection.check.ok
                      ? tx("数据已就绪")
                      : tx("需要检查数据映射")}
                </span>
              </div>
              <button
                className="secondary wide"
                onClick={() => setModal("import")}
              >
                <Upload size={15} />
                {tx("导入我的数据")}
              </button>
              <div className="field-summary">
                <button
                  className="small-link"
                  onClick={() => setModal("rename")}
                >
                  {tx("项目名称")}
                  <ChevronRight size={14} />
                </button>
                <h3>{tx("数据对应")}</h3>
                {recipe?.roles.slice(0, 4).map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setTab("data");
                      setParameterQuery("");
                    }}
                  >
                    <span>{r.label}</span>
                    <strong>
                      {Array.isArray(project.mapping[r.id])
                        ? project.mapping[r.id].join("、")
                        : project.mapping[r.id] || tx("未指定")}
                    </strong>
                    <ChevronRight size={12} />
                  </button>
                ))}
              </div>
              <div className="context-bottom">
                <button className="text-button" onClick={suggest}>
                  <Sparkles size={16} />
                  {tx("看看其他选图建议")}
                </button>
              </div>
            </aside>
            <section className="canvas-column" aria-label={tx("图形画布")}>
              <div className="canvas-heading">
                <div>
                  <span className="canvas-label">{tx("画布")}</span>
                  <h1>{recipe?.name}</h1>
                </div>
                <div className="canvas-heading-actions">
                  <span
                    className={"sync-state " + (renderError ? "has-error" : "")}
                  >
                    {renderError ? (
                      <AlertCircle size={14} />
                    ) : rendering ? (
                      <LoaderCircle className="spin" size={14} />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    <span>
                      {renderError
                        ? tx("需要检查")
                        : rendering
                          ? tx("正在同步")
                          : tx("已同步")}
                    </span>
                  </span>
                  <button
                    className="icon-button"
                    aria-label={
                      focusMode ? tx("退出专注模式") : tx("专注查看图形")
                    }
                    title={
                      focusMode ? tx("退出专注模式 Esc") : tx("专注查看图形")
                    }
                    aria-pressed={focusMode}
                    onClick={() => setFocusMode((v) => !v)}
                  >
                    {focusMode ? (
                      <PanelRightClose size={18} />
                    ) : (
                      <Focus size={18} />
                    )}
                  </button>
                </div>
              </div>
              {previewArea()}
              <div className="provenance">
                {metadata && (
                  <>
                    <span>
                      <Ruler size={13} />
                      {metadata.widthMm} × {metadata.heightMm} {tx("毫米")}
                    </span>
                    <span>
                      {tx("字体：")}
                      {fontLabel(metadata.fontUsed)}
                    </span>
                  </>
                )}
                {metadata?.warnings
                  ?.filter((w: string) => !w.includes("模拟"))
                  .map((w: string, i: number) => (
                    <span className="warning-text" key={i}>
                      {tx(w)}
                    </span>
                  ))}
              </div>
            </section>
            <aside className="inspector" aria-label={tx("图形参数")}>
              <div className="inspector-title">
                <div>
                  <SlidersHorizontal size={18} />
                  <h2>{tx("图形设置")}</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label={tx("保存为我的样式")}
                  title={tx("保存为我的样式")}
                  onClick={() => setModal("saveStyle")}
                >
                  <Palette size={18} />
                </button>
              </div>
              <div className="searchbox parameter-search">
                <Search size={15} />
                <input
                  aria-label={tx("搜索图形参数")}
                  placeholder={tx("搜索参数，如线宽、间距…")}
                  value={parameterQuery}
                  onChange={(e) => setParameterQuery(e.target.value)}
                />
                {parameterQuery && (
                  <button
                    aria-label={tx("清空参数搜索")}
                    onClick={() => setParameterQuery("")}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div
                className="inspector-tabs"
                role="group"
                aria-label={tx("参数分类")}
              >
                {[
                  ["style", tx("外观")],
                  ["note", tx("文字")],
                  ["axes", tx("坐标轴")],
                  ["layout", tx("画布")],
                  ["data", tx("数据")],
                  ["analysis", tx("计算")],
                ].map(([k, t]) => (
                  <button
                    key={k}
                    aria-pressed={tab === k && !parameterQuery}
                    className={tab === k && !parameterQuery ? "active" : ""}
                    onClick={() => {
                      setTab(k);
                      setParameterQuery("");
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="inspector-scroll">
                {parameterQuery ? (
                  <section className="property-section">
                    <h3>{tx("匹配的参数")}</h3>
                    {active
                      .filter((k: string) =>
                        [specs[k]?.label, specs[k]?.hint, k]
                          .join(" ")
                          .toLowerCase()
                          .includes(parameterQuery.trim().toLowerCase()),
                      )
                      .map((k: string) => control(k))}
                    {!active.some((k: string) =>
                      [specs[k]?.label, specs[k]?.hint, k]
                        .join(" ")
                        .toLowerCase()
                        .includes(parameterQuery.trim().toLowerCase()),
                    ) && (
                      <p className="helper">
                        {tx("当前图形没有匹配参数，试试“线宽”“字体”或“大小”。")}
                      </p>
                    )}
                  </section>
                ) : tab === "style" ? (
                  <>
                    <PaletteQuick
                      project={project}
                      locale={locale}
                      onApply={(palette) =>
                        edit((p) => {
                          applyPalette(p, palette);
                        }, "palette")
                      }
                      onBrowse={() => setModal("palette")}
                    />
                    {groups.length > 0 && (
                      <section className="property-section">
                        <div className="section-heading">
                          <h3>{tx("配色与描边")}</h3>
                        </div>
                        <div className="group-colors">
                          {groups.map((g: any, i: number) => (
                            <label key={g} title={g}>
                              <input
                                type="color"
                                aria-label={g + tx("颜色")}
                                value={
                                  project.colors[g] ||
                                  PALETTE[i % PALETTE.length]
                                }
                                onChange={(e) =>
                                  edit((p) => {
                                    p.colors[g] = e.target.value;
                                  }, "color:" + g)
                                }
                              />
                              <span>{g}</span>
                            </label>
                          ))}
                        </div>
                        {groups.length > 1 && (
                          <details className="order-control">
                            <summary>
                              {project.mapping.series
                                ? tx("系列顺序")
                                : tx("分组顺序")}
                            </summary>
                            <p className="helper">
                              {tx("上下移动只调整排列，颜色仍跟随组名。")}
                            </p>
                            <ol>
                              {project.groupOrder.map(
                                (g: string, i: number) => (
                                  <li key={g}>
                                    <span>{g}</span>
                                    <button
                                      className="icon-button"
                                      aria-label={tx("将") + g + tx("前移")}
                                      disabled={i === 0}
                                      onClick={() =>
                                        edit((p) => {
                                          [
                                            p.groupOrder[i - 1],
                                            p.groupOrder[i],
                                          ] = [
                                            p.groupOrder[i],
                                            p.groupOrder[i - 1],
                                          ];
                                        }, "order:" + g)
                                      }
                                    >
                                      ↑
                                    </button>
                                    <button
                                      className="icon-button"
                                      aria-label={tx("将") + g + tx("后移")}
                                      disabled={
                                        i === project.groupOrder.length - 1
                                      }
                                      onClick={() =>
                                        edit((p) => {
                                          [
                                            p.groupOrder[i + 1],
                                            p.groupOrder[i],
                                          ] = [
                                            p.groupOrder[i],
                                            p.groupOrder[i + 1],
                                          ];
                                        }, "order:" + g)
                                      }
                                    >
                                      ↓
                                    </button>
                                  </li>
                                ),
                              )}
                            </ol>
                          </details>
                        )}
                      </section>
                    )}

                    <section className="property-section">
                      <h3>{tx("形状与线条")}</h3>
                      {active
                        .filter(
                          (k: string) =>
                            specs[k]?.section === "shape" &&
                            !(
                              raincloudIds.has(project.recipeId) &&
                              ["width", "bandwidth", "pointSize"].includes(k)
                            ),
                        )
                        .map((k: string) => control(k))}
                    </section>
                    {raincloudIds.has(project.recipeId) && (
                      <>
                        <details className="recipe-explainer">
                          <summary>{tx("图层含义")}</summary>
                          <p className="helper raincloud-explainer">
                            {tx(
                              "云展示分布，箱线展示中位数与四分位区间，雨点保留每条原始观测。",
                            )}
                          </p>
                        </details>
                        {[
                          ["cloud", "密度云"],
                          ["rainbox", "箱线摘要"],
                          ["rain", "原始散点"],
                        ].map(([section, title]) => (
                          <details
                            className="parameter-group"
                            key={section}
                            open={section === "cloud"}
                          >
                            <summary>{tx(title)}</summary>
                            <div>
                              {active
                                .filter(
                                  (k: string) =>
                                    specs[k]?.section === section ||
                                    (section === "cloud" &&
                                      ["width", "bandwidth"].includes(k)) ||
                                    (section === "rain" && k === "pointSize"),
                                )
                                .map((k: string) => control(k))}
                            </div>
                          </details>
                        ))}
                      </>
                    )}
                  </>
                ) : tab === "note" ? (
                  <>
                    <section className="property-section">
                      <h3>{tx("标题与图注")}</h3>
                      {[
                        ["title", tx("图形标题")],
                        ["x", tx("横轴标题")],
                        ["y", tx("纵轴标题")],
                        ["note", tx("图注")],
                      ].map(([key, label]) => (
                        <label className="control" key={key}>
                          {label}
                          {key === "note" ? (
                            <textarea
                              value={project.labels[key]}
                              onChange={(e) => fieldLabel(key, e.target.value)}
                            />
                          ) : (
                            <input
                              placeholder={
                                key === "x" || key === "y"
                                  ? tx("留空使用数据列名")
                                  : tx("输入图形标题")
                              }
                              value={project.labels[key]}
                              onChange={(e) => fieldLabel(key, e.target.value)}
                            />
                          )}
                        </label>
                      ))}
                    </section>
                    <section className="property-section">
                      <h3>{tx("全局文字")}</h3>
                      {active
                        .filter((k: string) =>
                          ["fontFamily", "fontSize"].includes(k),
                        )
                        .map((k: string) => control(k))}
                    </section>
                    {["title", "legend"].map((section) => (
                      <details className="parameter-group" key={section}>
                        <summary>
                          {section === "title"
                            ? tx("标题与图注样式")
                            : tx("图例样式")}
                        </summary>
                        <div>
                          {active
                            .filter(
                              (k: string) =>
                                specs[k]?.section === section ||
                                (section === "title" && k === "titleGap") ||
                                (section === "legend" &&
                                  [
                                    "legend",
                                    "legendGap",
                                    "legendKeySize",
                                  ].includes(k)),
                            )
                            .map((k: string) => control(k))}
                        </div>
                      </details>
                    ))}
                  </>
                ) : tab === "axes" ? (
                  <>
                    {["xaxis", "yaxis"].map((section, i) => (
                      <details
                        className="parameter-group"
                        key={section}
                        open={i === 0}
                      >
                        <summary>
                          {i === 0 ? tx("横轴设置") : tx("纵轴设置")}
                        </summary>
                        <div>
                          {active
                            .filter(
                              (k: string) =>
                                specs[k]?.section === section ||
                                (i === 0 && k === "axisAngle") ||
                                (specs[k]?.section === "axes" &&
                                  k.startsWith(i === 0 ? "x" : "y")),
                            )
                            .map((k: string) => control(k))}
                        </div>
                      </details>
                    ))}
                  </>
                ) : tab === "layout" ? (
                  <>
                    <section className="property-section">
                      <h3>{tx("画布与留白")}</h3>
                      {active
                        .filter((k: string) => specs[k]?.section === "canvas")
                        .map((k: string) => control(k))}
                    </section>
                    <section className="property-section">
                      <h3>{tx("坐标显示范围")}</h3>
                      <div className="two-fields">
                        {active
                          .filter((k: string) => specs[k]?.section === "axes")
                          .map((k: string) => control(k))}
                      </div>
                      <button
                        className="secondary wide"
                        onClick={() =>
                          edit((p) => {
                            for (const k of ["xMin", "xMax", "yMin", "yMax"])
                              p.params[k] = null;
                          }, "reset-limits")
                        }
                      >
                        {tx("恢复自动范围")}
                      </button>
                      <p className="helper">
                        {tx(
                          "显示范围不改变原始数据或统计量。柱形和面积图应保留零基线。",
                        )}
                      </p>
                    </section>
                  </>
                ) : tab === "data" ? (
                  <section className="property-section">
                    <h3>{tx("把数据列对应到图形")}</h3>
                    <p className="helper">
                      {project.data.rows.length} {tx("行、")}
                      {project.data.columns.length} {tx("列，来自")}
                      {project.data.name}
                    </p>
                    {mappedFields()}
                    <button
                      className="secondary wide"
                      onClick={() => setPage("data")}
                    >
                      <Table2 size={16} />
                      {tx("查看并整理数据")}
                    </button>
                    <button
                      className="text-button wide"
                      onClick={() => setModal("import")}
                    >
                      <Upload size={16} />
                      {tx("导入新数据")}
                    </button>
                  </section>
                ) : (
                  <section className="property-section">
                    <h3>{tx("计算与数据设置")}</h3>
                    {active
                      .filter((k: string) => specs[k]?.section === "analysis")
                      .map((k: string) => control(k))}
                    <p className="template-boundary">{recipe?.notes}</p>
                  </section>
                )}
              </div>
            </aside>
          </main>
        )}
        {page === "home" && (
          <HomePage
            catalog={catalog}
            featured={featured}
            onChange={(ids: string[]) => {
              setFeatured(ids);
              try {
                localStorage.setItem(
                  "figure-home",
                  JSON.stringify({ version: 1, ids }),
                );
              } catch {
                setMessage(tx("无法保存推荐设置"));
              }
            }}
            onOpen={useExample}
            onLibrary={() => setPage("library")}
            locale={locale}
            busy={busy}
          />
        )}
        {page === "composition" && compositionReady && (
          <Composition
            value={composition}
            onChange={setComposition}
            onAddCurrent={addCurrentPanel}
            onEdit={(id: string) => {
              const panel = composition.panels.find((p: any) => p.id === id);
              if (panel) {
                replace(clone(panel.project));
                setPanelTarget(id);
                setPage("editor");
              }
            }}
            catalog={catalog}
            locale={locale}
            connected={connected}
          />
        )}
        {page === "library" && (
          <StudioLibrary
            catalog={catalog}
            visibleRecipes={visibleRecipes}
            selected={selected}
            setSelected={setSelected}
            query={query}
            setQuery={setQuery}
            family={family}
            setFamily={setFamily}
            scope={libraryScope}
            setScope={setLibraryScope}
            shape={dataShapeFilter}
            setShape={setDataShapeFilter}
            favorites={favorites}
            setFavorites={setFavorites}
            clearFilters={clearLibraryFilters}
            useExample={useExample}
            useMyData={useMyData}
            busy={busy}
            back={() => setPage("editor")}
            downloadExample={(id: string, name: string = id) =>
              task(tx("正在下载示例"), async () =>
                download(
                  await api("/api/examples/" + id + "?download=csv"),
                  id + "-demo-data.csv",
                ),
              )
            }
          />
        )}
        {page === "data" && (
          <main id="main-content" tabIndex={-1} className="data-page">
            <div className="page-title">
              <div>
                <h1>{tx("数据与字段对应")}</h1>
              </div>
              <button
                className="primary"
                onClick={() => {
                  setPage("editor");
                  setTab("style");
                }}
              >
                {tx("调整图形")}
                <ArrowRight size={16} />
              </button>
            </div>
            <details className="data-format-guide">
              <summary>{tx("查看当前图表的上传说明与示例")}</summary>
              <InputGuide recipe={recipe} />
            </details>
            <div className="data-layout">
              <section className="data-table-panel">
                <div className="table-tools">
                  <FileSpreadsheet size={20} />
                  <strong>{project.data.name}</strong>
                  <span>
                    {project.data.rows.length} {tx("行 ·")}{" "}
                    {project.data.columns.length} {tx("列")}
                  </span>
                  <button
                    className="small-link"
                    onClick={() => setModal("import")}
                  >
                    {tx("更换文件")}
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{tx("行")}</th>
                        {project.data.columns.map((c: string) => (
                          <th key={c}>
                            {c}
                            <small>
                              {inspection?.profile.find(
                                (x: any) => x.name === c,
                              )?.type === "number"
                                ? tx("数值")
                                : tx("文本")}
                            </small>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {project.data.rows
                        .slice(0, 50)
                        .map((row: any, i: number) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            {project.data.columns.map((c: string) => (
                              <td key={c}>
                                {row[c] === null ||
                                row[c] === undefined ||
                                row[c] === "" ? (
                                  <span className="missing">{tx("缺失")}</span>
                                ) : (
                                  String(row[c])
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <p className="table-note">
                  {project.data.rows.length > 50
                    ? tx("显示前50行，绘图使用全部数据")
                    : tx("已显示全部数据")}
                </p>
                <details className="data-transform">
                  <summary>{tx("将宽表整理成长表")}</summary>
                  <p className="helper">
                    {tx(
                      "例如：第一列是基因，每个样本各占一列。整理后得到“行名称、列名称、数值”。",
                    )}
                  </p>
                  <label>
                    {tx("保留的行名称列")}
                    <select
                      value={wideId}
                      onChange={(e) => setWideId(e.target.value)}
                    >
                      {project.data.columns.map((c: string) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <div className="check-list horizontal">
                    {project.data.columns
                      .filter((c: string) => c !== wideId)
                      .map((c: string) => (
                        <label key={c}>
                          <input
                            type="checkbox"
                            checked={wideCols.includes(c)}
                            onChange={(e) =>
                              setWideCols(
                                e.target.checked
                                  ? [...wideCols, c]
                                  : wideCols.filter((x) => x !== c),
                              )
                            }
                          />
                          {c}
                        </label>
                      ))}
                  </div>
                  <button
                    className="secondary"
                    onClick={() =>
                      changeData({
                        kind: "wideToLong",
                        idColumn: wideId,
                        valueColumns: wideCols,
                      })
                    }
                  >
                    {tx("整理选中的列")}
                  </button>
                </details>
                <details className="data-transform">
                  <summary>{tx("筛选与恢复原始表")}</summary>
                  <div className="two-fields">
                    <select
                      aria-label={tx("筛选列")}
                      value={filterColumn}
                      onChange={(e) => setFilterColumn(e.target.value)}
                    >
                      <option value="">{tx("选择筛选列")}</option>
                      {project.data.columns.map((c: string) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      aria-label={tx("保留的值")}
                      placeholder={tx("仅保留与此值相同的行")}
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                    />
                  </div>
                  <div className="two-actions">
                    <button
                      className="secondary"
                      onClick={() =>
                        changeData({
                          kind: "filter",
                          column: filterColumn,
                          equals: filterValue,
                        })
                      }
                    >
                      {tx("应用筛选")}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => changeData({ kind: "reset" })}
                    >
                      {tx("恢复原始数据")}
                    </button>
                  </div>
                  {project.transforms.map((t: any, i: number) => (
                    <p className="helper" key={i}>
                      {t.kind}：{t.before} {tx("行 →")}
                      {t.after} {tx("行")}
                    </p>
                  ))}
                </details>
              </section>
              <aside className="mapping-panel">
                <h2>{tx("对应数据含义")}</h2>
                {mappedFields()}
                {control("omitMissing")}
                <div
                  className={
                    "validation " + (inspection?.check.ok ? "valid" : "invalid")
                  }
                >
                  <strong>
                    {inspection?.check.ok
                      ? tx("数据已就绪")
                      : tx("请检查以下项目")}
                  </strong>
                  {inspection?.check.issues.map((s: string) => (
                    <p key={s}>{tx(s)}</p>
                  ))}
                  {inspection?.check.warnings.map((s: string) => (
                    <p key={s}>{tx(s)}</p>
                  ))}
                </div>
                <label className="control">
                  {tx("实验背景")}
                  <textarea
                    value={project.context}
                    onChange={(e) =>
                      edit((p) => {
                        p.context = e.target.value;
                      }, "context")
                    }
                  />
                </label>
                <button className="secondary wide" onClick={suggest}>
                  <Sparkles size={16} />
                  {tx("查看选图建议")}
                </button>
                <p className="helper">{recipe?.notes}</p>
              </aside>
            </div>
          </main>
        )}
      </div>
      {message && (
        <div className="toast" role="status">
          <span>{tx(message)}</span>
          <button aria-label={tx("关闭提示")} onClick={() => setMessage("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {busy && (
        <div className="busy-pill" role="status">
          <LoaderCircle size={16} className="spin" />
          {busy}
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal("");
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className={
              "modal " +
              (["export", "import", "palette"].includes(modal) ? "large" : "") +
              (modal === "import" ? " import-modal" : "")
            }
          >
            <div className="modal-head">
              <h2 id="modal-title">
                {
                  {
                    export: tx("保存与导出"),
                    palette: tx("配色库"),
                    import: tx("导入数据"),
                    projects: tx("我的项目"),
                    styles: tx("我的样式"),
                    history: tx("版本记录"),
                    saveStyle: tx("保存图形样式"),
                    rename: tx("项目名称"),
                    help: tx("使用帮助"),
                    agent: tx("与智能体协作"),
                    recommend: tx("根据当前数据选图"),
                  }[modal]
                }
              </h2>
              <button
                className="icon-button"
                aria-label={tx("关闭窗口")}
                onClick={() => setModal("")}
              >
                <X size={21} />
              </button>
            </div>
            <div className="modal-body">
              {modal === "palette" && (
                <PalettePicker
                  project={project}
                  locale={locale}
                  onApply={(palette) => {
                    edit((p) => {
                      applyPalette(p, palette);
                    }, "palette");
                    setModal("");
                  }}
                />
              )}
              {modal === "import" && (
                <DataImport recipe={recipe} onImported={applyImport} />
              )}
              {modal === "export" && (
                <div className="export-layout">
                  <div>
                    {previewArea(true)}
                    <button className="text-button" onClick={openHistory}>
                      <History size={16} />
                      {tx("查看项目历史版本")}
                    </button>
                  </div>
                  <div>
                    <h3>{tx("导出图片")}</h3>
                    <div className="format-tabs">
                      {["pdf", "svg", "png", "tiff"].map((f) => (
                        <button
                          key={f}
                          className={format === f ? "active" : ""}
                          onClick={() => setFormat(f)}
                        >
                          {f.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <p className="helper">
                      {tx(
                        ["svg", "pdf"].includes(format)
                          ? "矢量格式，适合排版和继续编辑图形元素。"
                          : "位图格式，按下方尺寸和分辨率生成。",
                      )}
                    </p>
                    <div className="two-fields">
                      {control("widthMm", "export")}
                      {control("heightMm", "export")}
                    </div>
                    {["png", "tiff"].includes(format) &&
                      control("dpi", "export")}
                    <button
                      className="primary wide"
                      disabled={!!busy || !!renderError || !connected}
                      onClick={exportFigure}
                    >
                      <Download size={16} />
                      {tx("导出图片")}
                    </button>
                    <button
                      className="secondary wide"
                      disabled={!!busy || !!renderError || !connected}
                      onClick={() =>
                        task(tx("准备 R 源码"), async () =>
                          download(
                            await api("/api/r-source", {
                              project: current.current,
                            }),
                            project.name + ".R",
                          ),
                        )
                      }
                    >
                      <Download size={16} />
                      {tx("下载原始 R 源码")}
                    </button>
                    <p className="helper">
                      {tx(
                        "包含实际绘图代码、数据和参数，可在 R / RStudio 独立运行。",
                      )}
                    </p>
                    <hr />
                    <h3>{tx("下次继续编辑")}</h3>
                    <button className="secondary wide" onClick={projectJSON}>
                      <Save size={16} />
                      {tx("下载可编辑项目文件")}
                    </button>
                    <button
                      className="secondary wide"
                      disabled={!!busy || !!renderError || !connected}
                      onClick={() =>
                        task(tx("正在打包数据与复现文件"), async () =>
                          download(
                            await api("/api/bundle", current.current),
                            project.name + tx("-复现包.zip"),
                          ),
                        )
                      }
                    >
                      <FolderOpen size={16} />
                      {tx("下载完整复现包")}
                    </button>
                    <p className="helper">
                      {tx(
                        "包含原始数据、整理后的数据、图形参数、R 程序和运行版本信息。",
                      )}
                    </p>
                  </div>
                </div>
              )}
              {modal === "projects" && (
                <>
                  <button
                    className="secondary wide"
                    onClick={() => projectFileRef.current?.click()}
                  >
                    <Upload size={16} />
                    {tx("打开本地项目文件")}
                  </button>
                  {entries.length === 0 ? (
                    <p className="empty-state">
                      {tx("还没有保存的项目。调整好图形后，点击“保存项目”。")}
                    </p>
                  ) : (
                    entries.map((e) => (
                      <button
                        className="list-row"
                        key={e.id}
                        onClick={() =>
                          task(tx("打开项目"), async () => {
                            replace(await api("/api/projects/" + e.id));
                            setModal("");
                            setPage("editor");
                          })
                        }
                      >
                        <FolderOpen size={21} />
                        <span>
                          <strong>{e.name}</strong>
                          <small>
                            {tx("版本")}
                            {e.revision} ·{" "}
                            {new Date(e.updatedAt).toLocaleString("zh-CN")}
                          </small>
                        </span>
                        <ChevronRight size={18} />
                      </button>
                    ))
                  )}
                </>
              )}
              {modal === "styles" && (
                <>
                  {entries.length === 0 ? (
                    <p className="empty-state">
                      {tx("先在外观面板保存一套样式，就能在新数据上复用。")}
                    </p>
                  ) : (
                    entries.map((e) => (
                      <button
                        className="list-row"
                        key={e.id}
                        onClick={() =>
                          task(tx("应用样式"), async () => {
                            const s = await api("/api/styles/" + e.id);
                            edit((p) => {
                              p.params = { ...p.params, ...s.params };
                              const preset = PALETTES.find(
                                (c) => c.id === s.paletteId,
                              );
                              if (preset && !paletteAvailability(p, preset))
                                applyPalette(p, preset);
                              p.colors = { ...p.colors, ...s.colors };
                              p.paletteId = s.paletteId ?? p.paletteId;
                            }, "style");
                            setModal("");
                          })
                        }
                      >
                        <Palette size={20} />
                        <span>
                          <strong>{e.name}</strong>
                          <small>
                            {tx("只应用样式，不覆盖你的数据和标题")}
                          </small>
                        </span>
                        <ChevronRight size={18} />
                      </button>
                    ))
                  )}
                </>
              )}
              {modal === "history" &&
                entries.map((e) => (
                  <button
                    className="list-row"
                    key={e.revision}
                    onClick={() =>
                      task(tx("恢复版本"), async () => {
                        const old = await api(
                          "/api/projects/" + project.id + "/" + e.revision,
                        );
                        old.revision = current.current.revision;
                        edit((p) => Object.assign(p, old), "restore");
                        setModal("");
                        setMessage(tx("已恢复为草稿，保存后会建立新版本。"));
                      })
                    }
                  >
                    <History size={20} />
                    <span>
                      <strong>
                        {tx("版本")}
                        {e.revision} · {e.name}
                      </strong>
                      <small>
                        {new Date(e.updatedAt).toLocaleString("zh-CN")}
                      </small>
                    </span>
                    <span>{tx("恢复")}</span>
                  </button>
                ))}
              {modal === "saveStyle" && (
                <>
                  <label className="control">
                    {tx("样式名称")}
                    <input
                      value={styleName}
                      onChange={(e) => setStyleName(e.target.value)}
                    />
                  </label>
                  <p className="helper">
                    {tx("保存配色和外观，不包含实验数据、标题与分析结论。")}
                  </p>
                  <button
                    className="primary wide"
                    onClick={() =>
                      task(tx("保存样式"), async () => {
                        await api("/api/styles", {
                          project: current.current,
                          name: styleName,
                        });
                        setModal("");
                        setMessage(tx("样式已保存。"));
                      })
                    }
                  >
                    {tx("保存样式")}
                  </button>
                </>
              )}
              {modal === "rename" && (
                <>
                  <label className="control">
                    {tx("项目名称")}
                    <input
                      autoFocus
                      value={project.name}
                      onChange={(e) =>
                        edit((p) => {
                          p.name = e.target.value || tx("未命名项目");
                        }, "name")
                      }
                    />
                  </label>
                  <button className="primary wide" onClick={() => setModal("")}>
                    {tx("完成")}
                  </button>
                </>
              )}
              {modal === "recommend" && (
                <>
                  <p className="helper">{recs?.notice}</p>
                  {recs?.results.map((r: any) => (
                    <button
                      className="recommend-row"
                      key={r.id}
                      onClick={() => {
                        setModal("");
                        useMyData(r.id);
                      }}
                    >
                      <img src={"/thumbnails/" + r.id + ".svg"} alt="" />
                      <span>
                        <strong>
                          {catalog.find((c) => c.id === r.id)?.name}
                        </strong>
                        <p>{tx(r.reason)}</p>
                      </span>
                      <ChevronRight size={17} />
                    </button>
                  ))}
                </>
              )}
              {modal === "agent" && (
                <>
                  <p>
                    {tx(
                      "让你正在使用的智能体读取实验背景、选择图形和整理表格，再在这里继续细调。",
                    )}
                  </p>
                  <div className="info-card">
                    <strong>{tx("两种入口，共用一个项目")}</strong>
                    <p>
                      {tx("已经有明确图形：告诉智能体图名，让它整理所需列。")}
                    </p>
                    <p>
                      {tx(
                        "不确定画什么：让智能体先确认实验单位、分组和配对关系，再推荐图形。",
                      )}
                    </p>
                  </div>
                  <p>
                    {tx(
                      "项目附带独立的“科研绘图”Skill 与命令接口。智能体输出的项目文件可从“我的项目”打开。",
                    )}
                  </p>
                  <button
                    className="secondary wide"
                    onClick={() => projectFileRef.current?.click()}
                  >
                    <Upload size={16} />
                    {tx("打开智能体准备的项目")}
                  </button>
                  <p className="helper">
                    {tx(
                      "网页本身不发送数据给外部模型。智能体调用使用你自己的账户，遵循你所用智能体的数据设置。",
                    )}
                  </p>
                </>
              )}
              {modal === "help" && (
                <>
                  <div className="help-steps">
                    <div>
                      <strong>{tx("先看示例")}</strong>
                      <p>
                        {tx("在图表库选择一种图，打开示例并下载数据格式。")}
                      </p>
                    </div>
                    <div>
                      <strong>{tx("导入自己的数据")}</strong>
                      <p>
                        {tx(
                          "选择文件和工作表，指定每列的含义。缺失值会提示，不会静默丢弃。",
                        )}
                      </p>
                    </div>
                    <div>
                      <strong>{tx("细调与复用")}</strong>
                      <p>
                        {tx(
                          "滑块、颜色与标题会触发实际 R 绘图。保存样式后可用于另一批数据。",
                        )}
                      </p>
                    </div>
                    <div>
                      <strong>{tx("保存和导出")}</strong>
                      <p>
                        {tx(
                          "项目文件可以再次编辑；矢量图用于排版，复现包保留数据与绘图程序。",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="info-card">
                    <strong>{tx("下次如何打开")}</strong>
                    <p>
                      {tx(
                        "双击项目文件夹中的「启动科研绘图.cmd」，会先启动本地绘图服务，再打开网页。仅打开网址不会自动启动服务。",
                      )}
                    </p>
                    <strong>{tx("当前运行环境")}</strong>
                    <p>
                      R {runtime.R || tx("未就绪")} · ggplot2{" "}
                      {runtime.ggplot2 || "—"} · {catalog.length} {tx("种图表")}
                    </p>
                    <p>
                      {tx(
                        "首次安装需要网络。安装完成后，手动导入、编辑、保存和导出可在本地运行。",
                      )}
                    </p>
                  </div>
                  <button
                    className="primary wide"
                    onClick={() => {
                      setModal("");
                      setPage("library");
                    }}
                  >
                    {tx("从开始页重新探索")}
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
