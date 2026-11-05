import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { zipSync } from "fflate";
import { importFile, csv } from "../server/import.mjs";
import { inputGuide } from "../shared/input-guide.mjs";
import { CATALOG } from "../shared/catalog.mjs";
import { DATA_FILE, fileProblem } from "../shared/file-contract.mjs";
const textFile = (text, name = "observations.csv", extra = {}) =>
  importFile({ name, base64: Buffer.from(text).toString("base64"), ...extra });
const workbookFile = async (book, extra = {}) =>
  importFile({
    name: "observations.xlsx",
    base64: Buffer.from(await book.xlsx.writeBuffer()).toString("base64"),
    ...extra,
  });

test("delimited text respects quoted separators, multiline cells and missing values", async () => {
  for (const [extension, separator] of [
    ["csv", ","],
    ["tsv", "\t"],
    ["txt", ";"],
  ]) {
    const result = await textFile(
      [
        '"Group, code"' + separator + "Value" + separator + "Note",
        "Control" + separator + "4.3" + separator + '"line1\nline2"',
        "Treatment" + separator + separator + '"a;b,c"',
      ].join("\n"),
      "table." + extension,
    );
    assert.deepEqual(result.data.columns, ["Group, code", "Value", "Note"]);
    assert.equal(result.data.rows[0].Note, "line1\nline2");
    assert.equal(result.profile[1].missing, 1);
  }
});
test("spreadsheet exports neutralize formula text while preserving negative measurements", async () => {
  const values = ["=1+2", "+1+2", "@SUM(1)", "-SUM(1,2)", "-1.72", "-2e-3", -3.8];
  const output = await textFile(csv({ columns: ["Value"], rows: values.map(Value => ({Value})) }));
  assert.deepEqual(output.data.rows.map(r => r.Value), ["'=1+2", "'+1+2", "'@SUM(1)", "'-SUM(1,2)", "-1.72", "-2e-3", "-3.8"]);
});
test("bad headers, malformed rows and oversize tables fail with actionable messages", async () => {
  for (const [content, message] of [
    ["Group,\nA,2", /空列名/],
    ["Value,Value\n1,2", /重复/],
    ["Group,Value\nA,1,2", /格式不一致/],
    ["Group,Value", /至少/],
  ])
    await assert.rejects(textFile(content), message);
  await assert.rejects(textFile("Value\n" + "1\n".repeat(30001)), /最多30000/);
  await assert.rejects(
    textFile(
      Array.from({ length: 101 }, (_, i) => "C" + i).join(",") +
        "\n" +
        Array(101).fill("1").join(","),
    ),
    /100列/,
  );
  assert.match(fileProblem("x.csv", DATA_FILE.maxBytes + 1), /10MB/);
  await assert.rejects(textFile("a\n1", "table.xls"), /XLSX/);
  await assert.rejects(textFile("", "empty.csv"), /空/);
  await assert.rejects(textFile("Note\n" + "a".repeat(2001)), /2000/);
});
test("legacy Chinese encoding can be retried without modifying bytes", async () => {
  // GBK/GB18030 for 组,值 followed by A,2.7.
  const base64 = Buffer.from([
    0xd7, 0xe9, 0x2c, 0xd6, 0xb5, 10, 65, 44, 50, 46, 55,
  ]).toString("base64");
  await assert.rejects(importFile({ name: "legacy.csv", base64 }), /编码/);
  const result = await importFile({
    name: "legacy.csv",
    base64,
    encoding: "gb18030",
  });
  assert.deepEqual(result.data.columns, ["组", "值"]);
  assert.equal(result.data.rows[0]["值"], "2.7");
});
test("Excel metadata remains available before validation; empty first sheets are skipped", async () => {
  const book = new ExcelJS.Workbook();
  book.addWorksheet("Empty");
  book.addWorksheet("Observations").addRows([
    ["Group", "Value"],
    ["Control", 3.75],
  ]);
  const meta = await workbookFile(book, { previewOnly: true });
  assert.deepEqual(meta.sheets, ["Empty", "Observations"]);
  assert.equal(meta.defaultSheet, "Observations");
  const result = await workbookFile(book);
  assert.equal(result.data.source.sheet, "Observations");
  assert.equal(result.data.rows[0].Value, 3.75);
  await assert.rejects(workbookFile(book, { sheet: "Empty" }), /至少/);
  assert.equal(
    (await workbookFile(book, { previewOnly: true })).sheets.length,
    2,
  );
});
test("Excel rejects merged cells and uncached or error formulas; dates remain importable", async () => {
  const book = new ExcelJS.Workbook(),
    sheet = book.addWorksheet("Data");
  sheet.addRows([
    ["Date", "Value"],
    [new Date("2026-10-05T00:00:00Z"), { formula: "2+3", result: 5 }],
  ]);
  assert.equal((await workbookFile(book)).data.rows[0].Date, "2026-10-05");
  sheet.getCell("B2").value = { formula: "2+3" };
  await assert.rejects(workbookFile(book), /缓存计算结果/);
  sheet.getCell("B2").value = { formula: "1/0", result: { error: "#DIV/0!" } };
  await assert.rejects(workbookFile(book), /公式错误/);
  sheet.getCell("B2").value = 5;
  sheet.mergeCells("A2:B2");
  await assert.rejects(workbookFile(book), /合并/);
});
test("Excel rejects malformed archives and oversized expansion before loading cells", async () => {
  await assert.rejects(textFile("not a workbook", "broken.xlsx"), /无法读取此 XLSX/);
  // A small ZIP claiming a huge entry is rejected from its directory, without allocation.
  const archive = Buffer.from(zipSync({ "xl/worksheets/sheet1.xml": new Uint8Array([65]) }));
  const directory = archive.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  assert(directory >= 0);
  archive.writeUInt32LE(65 * 1024 * 1024, directory + 24);
  await assert.rejects(importFile({ name: "oversized.xlsx", base64: archive.toString("base64") }), /XLSX 解压后超过64MB/);
  const crowded = zipSync(Object.fromEntries(Array.from({ length: 4097 }, (_, i) => ["x" + i, new Uint8Array()])));
  await assert.rejects(importFile({ name: "crowded.xlsx", base64: Buffer.from(crowded).toString("base64") }), /文件条目过多/);
});
test("all chart upload guides describe their actual required fields and English examples", () => {
  for (const recipe of CATALOG) {
    const guide = inputGuide(recipe.id);
    assert.ok(guide.row.zh && guide.row.en, recipe.id);
    assert.ok(guide.rows.length > 0, recipe.id);
    for (const field of guide.fields) {
      if (field.required) assert.ok(field.example, recipe.id + ":" + field.id);
      for (const column of [field.example].flat().filter(Boolean))
        assert.ok(guide.columns.includes(column), recipe.id + ":" + column);
    }
    assert.doesNotMatch(
      JSON.stringify([guide.columns, guide.rows]),
      /[\u3400-\u9fff]/,
      recipe.id,
    );
  }
  assert.match(inputGuide("histogram").row.en, /optional/);
  assert.match(inputGuide("volcano").rules[0].en, /-log10/);
  assert.match(inputGuide("raincloud_horizontal").rules[1].en, /three/);
});
