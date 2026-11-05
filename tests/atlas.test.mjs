import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { CATALOG, activeParams } from "../shared/catalog.mjs";
import { CHART_TYPES, chartType } from "../shared/chart-types.mjs";
import { exampleProject } from "../shared/examples.mjs";
import {
  parseProject,
  validateData,
  reconcileColors,
} from "../server/model.mjs";
import { renderProject, closeRWorkers, ROOT } from "../server/runtime.mjs";
test.after(() => closeRWorkers());
test("all templates have exactly one visible chart type and English-only deterministic demos", () => {
  const ids = CHART_TYPES.flatMap((t) => t.recipes);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), CATALOG.map((r) => r.id).sort());
  for (const r of CATALOG) {
    assert(chartType(r.id));
    const p = exampleProject(r.id);
    assert.deepEqual(p, exampleProject(r.id));
    assert(!/[\u4e00-\u9fff]/u.test(JSON.stringify(p)), r.id);
    assert.equal(p.params.fontFamily, "Times New Roman");
    assert.equal(p.params.linewidth, 0.5);
    assert(validateData(parseProject(p)).ok, r.id);
  }
});
test("new visual variants reject ambiguous summaries, invalid binary cells and misleading cropped bars", () => {
  for (const [id, mutate] of [
    ["binary_heatmap", (p) => (p.data.rows[0][p.mapping.value] = 0.5)],
    ["binary_heatmap", (p) => p.data.rows.pop()],
    ["bar_line", (p) => p.data.rows.push({ ...p.data.rows[0] })],
    ["grouped_stacked_bar", (p) => (p.data.rows[0][p.mapping.value] = -1)],
    ["grouped_violin", (p) => (p.data.rows = p.data.rows.slice(0, 2))],
    ["bar_plain", (p) => (p.params.yMin = 30)],
  ]) {
    const p = exampleProject(id);
    mutate(p);
    assert(!validateData(p).ok, id);
  }
  const user = exampleProject("bar");
  user.data.rows[0].备注 = "用户的中文数据";
  user.labels.title = "用户标题";
  const saved = parseProject(user);
  assert.equal(saved.data.rows[0].备注, "用户的中文数据");
  assert.equal(saved.labels.title, "用户标题");
});
test("bar summaries use all observations and theme changes alter actual R output without changing values", async () => {
  const p = exampleProject("bar_error");
  p.data.columns = ["group", "value"];
  p.data.rows = [
    { group: "A", value: 2 },
    { group: "A", value: 4 },
    { group: "A", value: 9 },
    { group: "B", value: 3 },
    { group: "B", value: 8 },
    { group: "B", value: 10 },
  ];
  p.mapping = { group: "group", value: "value" };
  const base = await renderProject(p);
  const groups = base.metadata.analysis.groups;
  assert.equal(groups.find((g) => g.group === "A").value, 5);
  assert.equal(groups.find((g) => g.group === "A").n, 3);
  const changed = structuredClone(p);
  changed.params.xAxisFontSize = 18;
  changed.params.xAxisColor = "#B5522A";
  changed.params.yAxisLine = false;
  changed.params.marginLeft = 18;
  changed.params.titleSize = 24;
  changed.labels.title = "Measured response";
  const modified = await renderProject(changed);
  assert.deepEqual(base.metadata.analysis, modified.metadata.analysis);
  const a = await fs.readFile(base.file, "utf8"),
    b = await fs.readFile(modified.file, "utf8");
  assert.notEqual(a, b);
  assert(b.includes("Measured response"));
  assert(b.includes("18.00px"));
  assert(!/[\u4e00-\u9fff]/u.test(b));
});
test("English derived volcano categories and component palettes affect the rendered figure", async () => {
  const p = reconcileColors(exampleProject("volcano"));
  assert(p.groupOrder.includes("Up"));
  assert(!p.groupOrder.includes("上调"));
  p.colors.Up = "#13579B";
  const r = await renderProject(p);
  assert((await fs.readFile(r.file, "utf8")).includes("#13579B"));
  const c = reconcileColors(exampleProject("grouped_stacked_bar"));
  assert.deepEqual(new Set(c.groupOrder), new Set(["Root", "Stem", "Leaf"]));
});
test("one-command draw delivers a real image, editable project and metadata without a browser", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "figure-draw-"));
  await fs.writeFile(
    path.join(dir, "measurements.csv"),
    "Treatment,Root length\nControl,58.3\nControl,64.9\nControl,61.8\nSalt,42.7\nSalt,37.6\nSalt,46.1\n",
  );
  const spec = path.join(dir, "spec.json");
  await fs.writeFile(
    spec,
    JSON.stringify({
      input: "measurements.csv",
      recipeId: "bar",
      name: "Draw workflow test",
      mapping: { group: "Treatment", value: "Root length" },
      synthetic: true,
      labels: { title: "", y: "Root length (mm)" },
    }),
  );
  const out = path.join(dir, "result.svg");
  await new Promise((resolve, reject) => {
    let err = "";
    const child = spawn(
      process.execPath,
      ["scripts/figure.mjs", "draw", "--spec", spec, "--out", out],
      { cwd: ROOT, windowsHide: true },
    );
    child.stderr.on("data", (v) => (err += v));
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(Error(err))));
  });
  assert((await fs.readFile(out, "utf8")).includes("<svg"));
  const project = JSON.parse(
    await fs.readFile(path.join(dir, "result.figure.json"), "utf8"),
  );
  assert.equal(project.data.rows.length, 6);
  assert(validateData(project).ok);
  assert.equal(
    JSON.parse(await fs.readFile(out + ".json", "utf8")).renderer,
    "R / ggplot2",
  );
});
