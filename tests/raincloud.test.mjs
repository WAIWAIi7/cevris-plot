import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { CATALOG, activeParams } from "../shared/catalog.mjs";
import { CHART_TYPES } from "../shared/chart-types.mjs";
import { filterRecipes } from "../shared/library.mjs";
import { exampleProject } from "../shared/examples.mjs";
import {
  parseProject,
  validateData,
  recommendations,
} from "../server/model.mjs";
import { renderProject, closeRWorkers } from "../server/runtime.mjs";
test.after(() => closeRWorkers());
const ids = ["raincloud", "raincloud_horizontal", "grouped_raincloud"];
test("raincloud is discoverable by both Chinese names and English, with valid independent examples", () => {
  assert.deepEqual(CHART_TYPES.find((c) => c.id === "raincloud").recipes, ids);
  for (const query of ["云雨", "雨云", "raincloud", "rain cloud"]) {
    assert.deepEqual(
      new Set(filterRecipes(CATALOG, { query }).map((r) => r.id)),
      new Set(ids),
    );
  }
  for (const id of ids) {
    const p = parseProject(exampleProject(id));
    assert(validateData(p).ok);
    assert(!/[\u4e00-\u9fff]/u.test(JSON.stringify(p)));
    assert(activeParams(id).includes(id === "raincloud" ? "yMin" : "xMin"));
    assert(!activeParams(id).includes(id === "raincloud" ? "xMin" : "yMin"));
    assert.equal(
      new Set(p.data.rows.map((r) => r.Sample)).size,
      p.data.rows.length,
    );
  }
  assert(
    recommendations(exampleProject("raincloud").data).results.some(
      (r) => r.id === "raincloud_horizontal",
    ),
  );
});
test("density is validated per actual group or group-series cell; hidden density does not reject constant observations", () => {
  for (const id of [...ids, "violin", "density"]) {
    const p = exampleProject(id),
      original = structuredClone(p.data);
    const a = p.data.rows[0];
    for (const r of p.data.rows)
      if (
        r[p.mapping.group] === a[p.mapping.group] &&
        (!p.mapping.series || r[p.mapping.series] === a[p.mapping.series])
      )
        r[p.mapping.value] = 42;
    assert(!validateData(p).ok, id);
    if (ids.includes(id)) {
      p.params.cloudVisible = false;
      assert(validateData(p).ok, id);
      p.params.boxVisible = false;
      p.params.rainVisible = false;
      assert(!validateData(p).ok, id + " all layers hidden");
    }
    assert.deepEqual(p.originalData, original);
  }
  const small = exampleProject("grouped_raincloud");
  small.data.rows = small.data.rows.filter(
    (r, i) => r.Genotype !== "Wild type" || r.Treatment !== "Control" || i < 2,
  );
  assert(!validateData(small).ok);
  const sparse = exampleProject("raincloud");
  sparse.data.rows = sparse.data.rows.filter(
    (r, i) => r.Treatment !== "Control" || i < 2,
  );
  assert(
    !recommendations(sparse.data).results.some((r) =>
      ["violin", "raincloud_horizontal"].includes(r.id),
    ),
  );
});
test("raincloud quartiles, whiskers and outliers match known values; every raw observation survives all orientations", async () => {
  for (const id of ids) {
    const p = exampleProject(id);
    p.params.outline = "none";
    const r = await renderProject(p),
      svg = await fs.readFile(r.file, "utf8");
    assert.equal(r.metadata.rows, p.data.rows.length);
    assert.equal(
      r.metadata.analysis.groups.reduce((n, g) => n + g.n, 0),
      p.data.rows.length,
    );
    assert.equal((svg.match(/<circle /g) || []).length, p.data.rows.length);
    assert(!/[\u4e00-\u9fff]/u.test(svg));
    assert(!r.metadata.warnings.some((w) => /Removed .*rows/.test(w)));
  }
  const p = exampleProject("raincloud_horizontal");
  p.data.columns = ["Group", "Value"];
  p.data.rows = [1, 2, 3, 4, 5, 6, 100].map((Value) => ({ Group: "A", Value }));
  p.mapping = { group: "Group", value: "Value" };
  const r = await renderProject(p),
    a = r.metadata.analysis.groups[0];
  assert.deepEqual(
    [a.n, a.q1, a.median, a.q3, a.lower, a.upper],
    [7, 2.5, 4, 5.5, 1, 6],
  );
  p.params.rainVisible = false;
  p.params.outline = "none";
  const box = await renderProject(p),
    svg = await fs.readFile(box.file, "utf8");
  assert.equal(
    (svg.match(/<circle /g) || []).length,
    1,
    "outlier remains when rain is hidden",
  );
  assert(
    svg.includes("#2E2E33"),
    "median and whiskers remain in no-outline mode",
  );
});
test("raincloud layer spacing, smoothing and coordinate zoom preserve the summaries and measurements", async () => {
  const p = exampleProject("raincloud_horizontal"),
    original = structuredClone(p);
  const base = await renderProject(p);
  p.params.cloudGap = 0.34;
  p.params.rainSpread = 0.24;
  p.params.rainBoxWidth = 0.26;
  p.params.bandwidth = 1.7;
  p.params.xMin = 20;
  p.params.xMax = 90;
  p.params.cloudOpacity = 0.4;
  p.params.rainOpacity = 0.65;
  const after = await renderProject(p);
  assert.deepEqual(
    base.metadata.analysis.groups,
    after.metadata.analysis.groups,
  );
  assert.notDeepEqual(
    base.metadata.analysis.density.bandwidths,
    after.metadata.analysis.density.bandwidths,
  );
  assert.equal(after.metadata.analysis.jitter.measurementJitter, 0);
  assert.deepEqual(after.metadata.viewLimits.x, [20, 90]);
  assert.deepEqual(p.data, original.data);
  assert.notEqual(
    await fs.readFile(base.file, "utf8"),
    await fs.readFile(after.file, "utf8"),
  );
  // Export follows the same R geometry and physical dimensions as the preview.
  for (const format of ["png", "pdf", "tiff"]) {
    const exported = await renderProject(p, format);
    assert((await fs.stat(exported.file)).size > 1000);
    assert.deepEqual(
      exported.metadata.analysis.groups,
      after.metadata.analysis.groups,
    );
    assert.equal(exported.metadata.fontUsed, "Times New Roman");
    assert.equal(exported.metadata.widthMm, 175);
  }
});
