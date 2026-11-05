import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { CATALOG } from "../shared/catalog.mjs";
import { exampleProject } from "../shared/examples.mjs";
import {
  parseProject,
  validateData,
  transform,
  reconcileColors,
} from "../server/model.mjs";
import { csv, importFile } from "../server/import.mjs";

test("all shipped examples meet their scientific input contract", () => {
  for (const r of CATALOG) {
    const p = parseProject(exampleProject(r.id));
    assert.equal(validateData(p).ok, true, r.id);
  }
});
test("missing data requires an explicit choice; original observations remain intact", () => {
  const p = parseProject(exampleProject("bar"));
  p.data.rows[0][p.mapping.value] = null;
  assert.equal(validateData(p).ok, false);
  p.params.omitMissing = true;
  const check = validateData(p);
  assert.equal(check.ok, true);
  assert.equal(check.usedRows, 47);
  assert.equal(p.originalData.rows.length, 48);
  assert.notEqual(p.originalData.rows[0][p.mapping.value], null);
});
test("duplicated paired measurements, zero p values and inverted intervals are rejected", () => {
  for (const id of ["paired", "volcano", "forest"]) {
    const p = parseProject(exampleProject(id));
    if (id === "paired") p.data.rows.push({ ...p.data.rows[0] });
    if (id === "volcano") p.data.rows[0][p.mapping.p] = 0;
    if (id === "forest") p.data.rows[0][p.mapping.lower] = 99999;
    assert.equal(validateData(p).ok, false, id);
  }
});
test("semantic group colours survive row reorder and addition", () => {
  const p = reconcileColors(parseProject(exampleProject("bar"))),
    key = p.groupOrder[0];
  p.colors[key] = "#123456";
  p.data.rows.reverse();
  p.data.rows.push({ ...p.data.rows[0], [p.mapping.group]: "新组" });
  const next = reconcileColors(p);
  assert.equal(next.colors[key], "#123456");
  assert.equal(next.groupOrder.at(-1), "新组");
});
test("wide to long and reset retain original data and record provenance", () => {
  const p = parseProject(exampleProject("heatmap"));
  p.data = {
    name: "wide",
    columns: ["gene", "S1", "S2"],
    rows: [
      { gene: "G1", S1: 2.7, S2: 3.9 },
      { gene: "G2", S1: 1.6, S2: 8.2 },
    ],
    synthetic: true,
  };
  p.originalData = structuredClone(p.data);
  const n = transform(p, {
    kind: "wideToLong",
    idColumn: "gene",
    valueColumns: ["S1", "S2"],
  });
  assert.equal(n.data.rows.length, 4);
  assert.equal(n.mapping.value, "数值");
  assert.deepEqual(n.originalData, p.data);
  assert.deepEqual(transform(n, { kind: "reset" }).data, p.data);
  assert.equal(n.transforms[0].after, 4);
});
test("CSV handles Chinese, quoted commas, missing cells and cached Excel formula results", async () => {
  const t = {
    name: "表格",
    columns: ["组别", "值", "备注"],
    rows: [
      { 组别: "甲", 值: 2.75, 备注: 'a,"b"' },
      { 组别: "乙", 值: null, 备注: "=1+1" },
    ],
  };
  const imported = await importFile({
    name: "表.csv",
    base64: Buffer.from(csv(t)).toString("base64"),
  });
  assert.equal(imported.data.rows[0]["备注"], 'a,"b"');
  assert.equal(imported.data.rows[1]["备注"], "'=1+1");
  assert.equal(imported.profile[1].missing, 1);
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("第一页").addRows([
    ["组", "值"],
    ["甲", 1.7],
  ]);
  const second = wb.addWorksheet("第二页");
  second.addRows([
    ["组", "值"],
    ["乙", { formula: "1+2", result: 3 }],
  ]);
  const x = await importFile({
    name: "test.xlsx",
    sheet: "第二页",
    base64: Buffer.from(await wb.xlsx.writeBuffer()).toString("base64"),
  });
  assert.equal(x.data.rows[0]["值"], 3);
  assert.equal(x.data.source.sheet, "第二页");
  assert.equal(x.sheets.length, 2);
});
test("invalid settings and duplicate categories in order cannot reach R", () => {
  const p = exampleProject("violin");
  p.params.linewidth = -1;
  assert.throws(() => parseProject(p));
  p.params.linewidth = 0.5;
  p.groupOrder = ["x", "x"];
  assert.throws(() => parseProject(p));
});
