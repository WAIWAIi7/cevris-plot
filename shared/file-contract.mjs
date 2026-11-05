export const DATA_FILE = {
  accept: ".csv,.tsv,.txt,.xlsx",
  maxBytes: 10 * 1024 * 1024,
  maxRows: 30000,
  maxColumns: 100,
  extensions: ["csv", "tsv", "txt", "xlsx"],
};
export const dataFileType = (name) =>
  String(name).split(".").pop().toLowerCase();
export function fileProblem(name, size) {
  if (!DATA_FILE.extensions.includes(dataFileType(name)))
    return "请上传 CSV、TSV、TXT 或 XLSX；旧版 XLS 请先另存为 XLSX";
  if (size > DATA_FILE.maxBytes) return "文件超过10MB，请拆分数据后再导入";
  if (!size) return "文件为空，请选择包含表头和数据的文件";
  return "";
}
