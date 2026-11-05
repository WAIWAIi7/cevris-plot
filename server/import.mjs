import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import { createHash } from "node:crypto";
import { unzipSync } from "fflate";
import { tableSchema, profile } from "./model.mjs";
import { DATA_FILE, fileProblem } from "../shared/file-contract.mjs";
export function csv(table) {
  const safe = (v) => {
    let s = String(v ?? "");
    if (typeof v === "string" && (/^[=+@\t\r]/.test(s) ||
      (/^-/.test(s) && !Number.isFinite(Number(s))))) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [table.columns, ...table.rows.map((r) => table.columns.map((c) => r[c]))]
      .map((r) => r.map(safe).join(","))
      .join("\r\n")
  );
}
function normalize(rows) {
  const nonempty = rows.filter((r) =>
    r.some((v) => v !== null && v !== undefined && String(v).trim() !== ""),
  );
  if (nonempty.length < 2) throw new Error("表格至少需要一行列名和一行数据");
  if (
    nonempty.length - 1 > DATA_FILE.maxRows ||
    nonempty[0].length > DATA_FILE.maxColumns
  )
    throw new Error("表格最多30000行数据、100列，请拆分后导入");
  const columns = nonempty[0].map((c) => String(c ?? "").trim());
  if (columns.some((c) => !c))
    throw new Error("表头存在空列名，请填写第一行的每个列名");
  if (columns.some((c) => c.length > 100))
    throw new Error("列名最多100个字符，请缩短表头");
  if (new Set(columns).size !== columns.length)
    throw new Error("表头有重复列名，请重命名后导入");
  if (
    nonempty.some((row) =>
      row.some((value) => typeof value === "string" && value.length > 2000),
    )
  )
    throw new Error("文本单元格最多2000个字符，请缩短长文本后导入");
  return {
    columns,
    rows: nonempty
      .slice(1)
      .map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i] ?? null]))),
  };
}
export async function importFile({
  name,
  base64,
  sheet,
  encoding = "utf-8",
  previewOnly = false,
}) {
  if (
    typeof name !== "string" ||
    name.length > 200 ||
    typeof base64 !== "string" ||
    base64.length > 16000000
  )
    throw new Error("请选择不超过10MB的数据文件");
  const bytes = Buffer.from(base64, "base64");
  const problem = fileProblem(name, bytes.length);
  if (problem) throw new Error(problem);
  let table,
    sheets = [];
  if (/\.xlsx$/i.test(name)) {
    // Inspect the central directory without inflating entries before ExcelJS.
    let expanded = 0, entries = 0;
    try {
      unzipSync(bytes, { filter(entry) {
        expanded += entry.originalSize;
        if (++entries > 4096 || expanded > 64 * 1024 * 1024)
          throw new Error("XLSX 解压后超过64MB或文件条目过多，请另存为CSV或减少工作表后导入");
        return false;
      } });
    } catch (error) {
      if (error.message.startsWith("XLSX 解压")) throw error;
      throw new Error("无法读取此 XLSX，请在表格软件中另存为标准 XLSX 后重试");
    }
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(bytes);
    } catch {
      throw new Error("无法读取此 XLSX，请在表格软件中另存为标准 XLSX 后重试");
    }
    sheets = workbook.worksheets.map((s) => s.name);
    const defaultSheet = (
      workbook.worksheets.find((s) => s.actualRowCount >= 2) ||
      workbook.worksheets[0]
    )?.name;
    if (previewOnly)
      return {
        sheets,
        defaultSheet,
        sheetInfo: workbook.worksheets.map((s) => ({
          name: s.name,
          rows: Math.max(0, s.actualRowCount - 1),
          columns: s.columnCount,
        })),
      };
    const ws = workbook.getWorksheet(sheet || defaultSheet);
    if (!ws) throw new Error("找不到所选工作表");
    if (ws.rowCount > 30001 || ws.columnCount > 100)
      throw new Error("工作表最多30000行、100列");
    const rows = [];
    ws.eachRow({ includeEmpty: true }, (row) => {
      rows.push(
        Array.from({ length: ws.columnCount }, (_, i) => {
          const v = row.getCell(i + 1).value;
          if (row.getCell(i + 1).isMerged)
            throw new Error("工作表含合并单元格，请取消合并并逐行填写后导入");
          if (v && typeof v === "object") {
            if (v instanceof Date)
              return v.toISOString().replace(/T00:00:00\.000Z$/, "");
            if (v.formula || v.sharedFormula) {
              if (v.result == null)
                throw new Error(
                  "公式没有缓存计算结果，请在表格软件中重新计算并保存，或粘贴为数值后导入",
                );
              if (typeof v.result === "object")
                throw new Error("表格包含公式错误，请修正错误单元格后导入");
              return v.result;
            }
            if (v.error)
              throw new Error("表格包含公式错误，请修正错误单元格后导入");
            if (v.richText) return v.richText.map((t) => t.text).join("");
            return v.text ?? null;
          }
          return v ?? null;
        }),
      );
    });
    table = normalize(rows);
    sheet = ws.name;
  } else if (/\.(csv|tsv|txt)$/i.test(name)) {
    if (!["utf-8", "gb18030"].includes(encoding))
      throw new Error("不支持的文件编码");
    let text;
    try {
      text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
    } catch {
      throw new Error(
        "文件编码无法识别，请切换为 GB18030，或将文件另存为 UTF-8 后重试",
      );
    }
    let delimiter = /\.tsv$/i.test(name) ? "\t" : ",";
    if (!/\.tsv$/i.test(name))
      for (const candidate of [",", "\t", ";"]) {
        try {
          const header = parse(text, {
            bom: true,
            delimiter: candidate,
            to: 1,
            skip_empty_lines: true,
          });
          if (header[0]?.length > 1) {
            delimiter = candidate;
            break;
          }
        } catch {
          /* Try the next supported delimiter, respecting quoted fields. */
        }
      }
    let records;
    try {
      records = parse(text, {
        bom: true,
        delimiter,
        relax_column_count: false,
        skip_empty_lines: true,
        max_record_size: 200000,
        on_record(record, info) {
          if (
            info.records > DATA_FILE.maxRows + 1 ||
            record.length > DATA_FILE.maxColumns
          )
            throw new Error("表格最多30000行数据、100列，请拆分后导入");
          return record;
        },
      });
    } catch (error) {
      if (/^表格最多/.test(error.message)) throw error;
      throw new Error("文本表格格式不一致，请检查每行列数、分隔符和成对引号");
    }
    table = normalize(records);
  } else throw new Error("请使用 CSV、TSV 或 XLSX 文件");
  const data = tableSchema.parse({
    ...table,
    name,
    synthetic: false,
    source: {
      name,
      sheet,
      hash: createHash("sha256").update(bytes).digest("hex"),
      base64,
    },
  });
  return { data, sheets, profile: profile(data) };
}
