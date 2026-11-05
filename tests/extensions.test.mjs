import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { exampleProject } from "../shared/examples.mjs";
import {
  parseProject,
  validateData,
  reconcileColors,
  suggestMapping,
} from "../server/model.mjs";
import { renderProject, ROOT } from "../server/runtime.mjs";
import path from "node:path";
const bad = (id, change) => {
  const p = parseProject(exampleProject(id));
  change(p);
  assert.equal(validateData(p).ok, false, id);
};
test("ROC and PR mappings distinguish coexisting metric columns", () => {
  const data = exampleProject("roc").data;
  assert.equal(suggestMapping("roc", data).x, "False positive rate");
  assert.equal(suggestMapping("precision_recall", data).x, "Recall");
  assert.equal(suggestMapping("precision_recall", data).y, "Precision");
});
test("curve and expression inputs reject scientifically inconsistent rows", () => {
  bad("survival", (p) => (p.data.rows[2][p.mapping.y] = 1));
  bad("roc", (p) => (p.data.rows[3][p.mapping.y] = 1.2));
  bad("ribbon", (p) => (p.data.rows[0][p.mapping.lower] = 999));
  bad(
    "bland_altman",
    (p) =>
      (p.data.rows[1][p.mapping.subject] = p.data.rows[0][p.mapping.subject]),
  );
  bad("dot_matrix", (p) => (p.data.rows[0][p.mapping.size] = 37));
  bad("manhattan", (p) => (p.data.rows[0][p.mapping.p] = 0));
  bad("waterfall", (p) => p.data.rows.push({ ...p.data.rows[0] }));
});
test("old projects gain automatic axes; impossible ranges and cropped zero baselines are rejected", () => {
  const raw = exampleProject("bar");
  delete raw.params.yMin;
  delete raw.params.yMax;
  const p = parseProject(raw);
  assert.equal(p.params.yMin, null);
  bad("bar", (p) => (p.params.yMin = 10));
  bad("scatter", (p) => {
    p.params.xMin = 5;
    p.params.xMax = 2;
  });
  bad("ma", (p) => (p.params.xMin = 0));
  const zoom = parseProject(exampleProject("scatter"));
  zoom.params.yMin = 30;
  assert.equal(validateData(zoom).usedRows, zoom.data.rows.length);
  assert(
    validateData(zoom).warnings.some(
      (w) => w.includes("完整") || w.includes("参与计算"),
    ),
  );
});
test("moving a category changes its order without reassigning semantic colours", () => {
  const p = reconcileColors(parseProject(exampleProject("bar"))),
    colors = { ...p.colors };
  p.groupOrder.reverse();
  const next = reconcileColors(p);
  assert.deepEqual(next.groupOrder, p.groupOrder);
  assert.deepEqual(next.colors, colors);
});
test(
  "R agreement calculations match known pairs and remain unchanged after coordinate zoom",
  { timeout: 40000 },
  async () => {
    const p = exampleProject("bland_altman");
    p.data = {
      name: "known pairs",
      columns: ["id", "a", "b"],
      synthetic: true,
      rows: [
        { id: "A", a: 10, b: 12 },
        { id: "B", a: 20, b: 23 },
        { id: "C", a: 30, b: 34 },
        { id: "D", a: 40, b: 45 },
      ],
    };
    p.originalData = structuredClone(p.data);
    p.mapping = { subject: "id", first: "a", second: "b" };
    const base = await renderProject(p),
      a = base.metadata.analysis;
    assert.equal(a.n, 4);
    assert.equal(a.bias, 3.5);
    assert(Math.abs(a.sd - Math.sqrt(5 / 3)) < 0.0001);
    p.params.xMin = 15;
    p.params.xMax = 35;
    p.params.legendGap = 6;
    p.params.tickLength = 2;
    const zoom = await renderProject(p);
    assert.deepEqual(zoom.metadata.analysis, a);
    assert.equal(zoom.metadata.rows, 4);
    assert.deepEqual(zoom.metadata.viewLimits.x, [15, 35]);
    assert.deepEqual(zoom.metadata.displayRanges.x, [15, 35]);
    assert.notEqual(
      await fs.readFile(base.file, "utf8"),
      await fs.readFile(zoom.file, "utf8"),
    );
    await fs.mkdir(path.join(ROOT, "verification"), { recursive: true });
    await fs.writeFile(
      path.join(ROOT, "verification", "extension-calculations.json"),
      JSON.stringify({ agreement: a, zoomKeepsAllRows: true }, null, 2),
    );
  },
);
test(
  "R honours category order and point summaries use all observations",
  { timeout: 40000 },
  async () => {
    const p = reconcileColors(parseProject(exampleProject("mean_interval")));
    const first = await renderProject(p),
      order = [...p.groupOrder].reverse();
    p.groupOrder = order;
    p.params.yMin = 35;
    const second = await renderProject(p);
    assert.deepEqual(second.metadata.groupOrder, order);
    const groups = (a) =>
      a.metadata.analysis.groups
        .map((x) => ({ group: x.group, value: x.value, n: x.n }))
        .sort((a, b) => a.group.localeCompare(b.group));
    assert.deepEqual(groups(first), groups(second));
    assert.equal(second.metadata.rows, p.data.rows.length);
  },
);
test(
  "legend spacing moves exported legend labels in both orientations",
  { timeout: 40000 },
  async () => {
    const p = exampleProject("ribbon");
    for (const position of ["right", "bottom"]) {
      p.params.legend = position;
      const positions = [];
      for (const gap of [0, 10]) {
        p.params.legendGap = gap;
        const result = await renderProject(p),
          svg = await fs.readFile(result.file, "utf8");
        const labels = [
          ...svg.matchAll(
            /<text x='([^']+)' y='([^']+)'[^>]*>(Control|Treatment)<\/text>/g,
          ),
        ];
        assert.equal(labels.length, 2);
        const axis = position === "right" ? 2 : 1;
        positions.push(
          Math.abs(Number(labels[1][axis]) - Number(labels[0][axis])),
        );
      }
      // The spacing control adds ten millimetres between adjacent keys (~28.35 SVG points).
      assert(
        Math.abs(positions[1] - positions[0] - (10 * 72) / 25.4) < 0.1,
        `${position}: ${positions}`,
      );
    }
  },
);
