import React, { useEffect, useRef, useState } from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  Check,
  AlertCircle,
  ChevronDown,
  LoaderCircle,
} from "lucide-react";
import { api, readBase64, download } from "./api";
import { tx, currentLocale } from "./i18n";
import {
  DATA_FILE,
  fileProblem,
  dataFileType,
} from "../shared/file-contract.mjs";

const bilingual = (text: any) => text?.[currentLocale()] || "";
export function InputGuide({
  recipe,
  compact = false,
}: {
  recipe: any;
  compact?: boolean;
}) {
  const [guide, setGuide] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setGuide(null);
    setError("");
    api("/api/input-guide/" + recipe.id)
      .then((g) => {
        if (live) setGuide(g);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [recipe.id]);
  const sample = async () => {
    try {
      download(
        await api("/api/examples/" + recipe.id + "?download=csv"),
        recipe.id + "-demo-data.csv",
      );
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <section className={"input-guide " + (compact ? "compact" : "")}>
      <div className="guide-heading">
        <div>
          <span>{tx("当前图表的数据格式")}</span>
          <h3>{recipe.name}</h3>
        </div>
        <button className="secondary" onClick={sample}>
          <Download size={15} />
          {tx("下载示例 CSV")}
        </button>
      </div>
      {error && (
        <p role="alert" className="inline-error">
          {tx(error)}
        </p>
      )}
      {guide && (
        <>
          <p className="guide-row">{bilingual(guide.row)}</p>
          <div className="guide-fields">
            {guide.fields.map((f: any) => (
              <div key={f.id}>
                <strong>
                  {recipe.roles.find((r: any) => r.id === f.id)?.label ||
                    f.label}
                </strong>
                <span>
                  {f.type === "number"
                    ? tx("数值型")
                    : f.type === "multi"
                      ? tx("多个数值列")
                      : tx("文本或分类")}
                  {!f.required ? tx(" · 可选") : ""}
                </span>
                <code>
                  {Array.isArray(f.example)
                    ? f.example.join(", ")
                    : f.example || "—"}
                </code>
              </div>
            ))}
          </div>
          {!compact && (
            <div className="guide-sample table-scroll">
              <table>
                <thead>
                  <tr>
                    {guide.columns.map((c: string) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guide.rows.map((r: any, i: number) => (
                    <tr key={i}>
                      {guide.columns.map((c: string) => (
                        <td key={c}>{String(r[c] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="guide-caption">
            {tx("示例列名仅作参考，导入后可以对应自己的列名。")}
          </p>
          {guide.rules.length > 0 && (
            <ul className="guide-rules">
              {guide.rules.map((rule: any, i: number) => (
                <li key={i}>{bilingual(rule)}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
export function DataImport({
  recipe,
  onImported,
}: {
  recipe: any;
  onImported: (result: any, file: File) => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null),
    generation = useRef(0);
  const [file, setFile] = useState<File | null>(null),
    [encoded, setEncoded] = useState(""),
    [encoding, setEncoding] = useState("utf-8"),
    [sheets, setSheets] = useState<string[]>([]),
    [sheet, setSheet] = useState(""),
    [result, setResult] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [drag, setDrag] = useState(false);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  async function read(
    selected: File,
    codec = encoding,
    selectedSheet?: string,
    existing = encoded,
  ) {
    const revision = ++generation.current;
    setFile(selected);
    setError("");
    setResult(null);
    setBusy(true);
    if (!selectedSheet) {
      setSheets([]);
      setSheet("");
    }
    try {
      const problem = fileProblem(selected.name, selected.size);
      if (problem) throw new Error(problem);
      const base64 =
        selected === file && existing ? existing : await readBase64(selected);
      if (revision !== generation.current) return;
      setEncoded(base64);
      const payload = { name: selected.name, base64, encoding: codec };
      let chosen = selectedSheet;
      if (dataFileType(selected.name) === "xlsx" && !chosen) {
        const book = await api("/api/import", {
          ...payload,
          previewOnly: true,
        });
        if (revision !== generation.current) return;
        setSheets(book.sheets);
        chosen = book.defaultSheet;
        setSheet(chosen || "");
      }
      const parsed = await api("/api/import", { ...payload, sheet: chosen });
      if (revision === generation.current) setResult(parsed);
    } catch (e: any) {
      if (revision === generation.current) setError(e.message);
    } finally {
      if (revision === generation.current) setBusy(false);
    }
  }
  async function confirm() {
    if (!result || !file) return;
    setBusy(true);
    setError("");
    try {
      await onImported(result, file);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="import-layout">
      <InputGuide recipe={recipe} />
      <section className="import-picker">
        <input
          ref={input}
          type="file"
          accept={DATA_FILE.accept}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) read(f);
            e.target.value = "";
          }}
        />
        <button
          className={"file-drop " + (drag ? "dragging" : "")}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files;
            if (f.length !== 1) {
              setError(tx("每次请选择一个数据文件"));
              return;
            }
            read(f[0]);
          }}
        >
          {file ? <FileSpreadsheet size={28} /> : <Upload size={28} />}
          <strong>{file ? file.name : tx("选择或拖入数据文件")}</strong>
          <span>{file ? tx("点击更换文件") : "CSV · TSV · TXT · XLSX"}</span>
        </button>
        <p className="file-limits">{tx("最大10MB · 30,000行 · 100列")}</p>
        {sheets.length > 0 && (
          <label className="control">
            {tx("工作表")}
            <select
              aria-label={tx("导入工作表")}
              value={sheet}
              disabled={busy}
              onChange={(e) => {
                setSheet(e.target.value);
                if (file) read(file, encoding, e.target.value);
              }}
            >
              {sheets.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        {(!file || dataFileType(file.name) !== "xlsx") && (
          <label className="control">
            {tx("文本编码")}
            <select
              aria-label={tx("文本编码")}
              value={encoding}
              disabled={busy}
              onChange={(e) => {
                setEncoding(e.target.value);
                if (file) read(file, e.target.value);
              }}
            >
              <option value="utf-8">UTF-8</option>
              <option value="gb18030">GB18030 / GBK</option>
            </select>
          </label>
        )}
        {busy && (
          <p role="status" className="import-status">
            <LoaderCircle size={16} className="spin" />
            {tx("正在读取表格")}
          </p>
        )}
        {error && (
          <div className="inline-error" role="alert">
            <AlertCircle size={17} />
            <span>{tx(error)}</span>
          </div>
        )}
        {result && (
          <div className="import-ready">
            <Check size={17} />
            <span>
              {result.data.rows.length} {tx("行数据")} ·{" "}
              {result.data.columns.length} {tx("列")}
            </span>
            <div className="import-column-list">
              {result.data.columns.slice(0, 8).map((c: string) => (
                <span key={c}>{c}</span>
              ))}
              {result.data.columns.length > 8 && (
                <span>+{result.data.columns.length - 8}</span>
              )}
            </div>
          </div>
        )}
        <details className="import-rules">
          <summary>
            {tx("表格准备要求")}
            <ChevronDown size={15} />
          </summary>
          <ul>
            <li>{tx("第一行是唯一列名，不要添加标题行或合并单元格。")}</li>
            <li>{tx("测量列只填数值，单位放在列名中；缺失值留空。")}</li>
            <li>{tx("Excel 公式需先计算并保存，建议粘贴为数值。")}</li>
            <li>
              {tx(
                "TXT 使用逗号、制表符或分号分隔；不支持图片、PDF 和旧版 XLS。",
              )}
            </li>
          </ul>
        </details>
        <button
          className="primary wide"
          disabled={busy || !result || !!error}
          onClick={confirm}
        >
          {tx("导入并对应数据列")}
        </button>
      </section>
    </div>
  );
}
