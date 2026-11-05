import test from "node:test";
import assert from "node:assert/strict";
import { latestPreviewQueue } from "../web/preview-queue.mjs";
import { exampleProject } from "../shared/examples.mjs";
import fs from "node:fs/promises";
import { parseProject, validateData } from "../server/model.mjs";
import { renderProject, closeRWorkers } from "../server/runtime.mjs";
test.after(() => closeRWorkers());
test(
  "no-outline mode retains every filled observation and funnel references render",
  { timeout: 40000 },
  async () => {
    for (const id of ["beeswarm", "scatter", "dot_matrix", "volcano"]) {
      const p = exampleProject(id);
      p.params.outline = "none";
      const r = await renderProject(p),
        svg = await fs.readFile(r.file, "utf8");
      assert((svg.match(/<circle /g) || []).length >= p.data.rows.length, id);
      assert(!r.metadata.warnings.some((w) => /Removed .*rows/.test(w)), id);
    }
    const funnel = await renderProject(exampleProject("funnel")),
      svg = await fs.readFile(funnel.file, "utf8");
    assert(
      (svg.match(/stroke-dasharray/g) || []).length >= 3,
      "all three funnel reference lines",
    );
  },
);
test("continuous edits run first and latest revisions, without starving preview", async () => {
  const requests = [],
    received = [],
    states = [];
  let resolve;
  const q = latestPreviewQueue(
    (p) => {
      requests.push(p);
      return new Promise((r) => {
        resolve = r;
      });
    },
    (r) => received.push(r),
    (b) => states.push(b),
    (e) => {
      throw e;
    },
  );
  q.submit(1, "dataA");
  for (let i = 2; i <= 50; i++) q.submit(i, "dataA");
  assert.deepEqual(requests, [1]);
  resolve("frame1");
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(requests, [1, 50]);
  assert.deepEqual(received, ["frame1"]);
  resolve("frame50");
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(received, ["frame1", "frame50"]);
  assert.equal(states.at(-1), false);
  q.dispose();
});
test("a late frame from another dataset cannot replace the new figure", async () => {
  const received = [];
  let resolve;
  const q = latestPreviewQueue(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
    (r) => received.push(r),
    () => {},
    () => {},
  );
  q.submit(1, "old");
  q.submit(2, "new");
  resolve("old");
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(received, []);
  resolve("new");
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(received, ["new"]);
  q.dispose();
});
test("new scientific contracts reject missing grid cells, invalid compositions, duplicated membership and false ranks", () => {
  const bad = (id, edit) => {
    const p = parseProject(exampleProject(id));
    edit(p);
    assert.equal(validateData(p).ok, false, id);
  };
  bad("contour", (p) => p.data.rows.pop());
  bad("ternary", (p) => (p.data.rows[0][p.mapping.a] = -2));
  bad("radar", (p) => (p.params.radarMax = 5));
  bad("sankey", (p) => (p.data.rows[0][p.mapping.value] = -1));
  bad("network", (p) => p.data.rows.push({ ...p.data.rows[0] }));
  bad("upset", (p) => p.data.rows.push({ ...p.data.rows[0] }));
  bad("bump", (p) => (p.data.rows[0][p.mapping.y] = 1.4));
  bad("scree", (p) => {
    for (const row of p.data.rows) row[p.mapping.columns[0]] = 1;
  });
});
test(
  "persistent R worker keeps jobs isolated and computes exact set intersections",
  { timeout: 40000 },
  async () => {
    const p = exampleProject("upset");
    const fresh = Math.random() * 0.01;
    p.params.fontSize = 11.1 + fresh;
    p.data = {
      name: "known sets",
      columns: ["元素", "集合"],
      synthetic: true,
      rows: [
        { 元素: "a", 集合: "X" },
        { 元素: "a", 集合: "Y" },
        { 元素: "b", 集合: "X" },
        { 元素: "c", 集合: "Y" },
      ],
    };
    p.originalData = structuredClone(p.data);
    p.mapping = { element: "元素", set: "集合" };
    const r = await renderProject(p);
    assert.equal(r.metadata.analysis.totalElements, 3);
    assert.equal(
      Object.values(r.metadata.analysis.counts).reduce((a, b) => a + b, 0),
      3,
    );
    const next = exampleProject("scree");
    next.params.fontSize = 11.2 + fresh;
    const pc = await renderProject(next);
    assert.equal(pc.metadata.warmWorker, true);
    assert(
      Math.abs(
        pc.metadata.analysis.variancePercent.reduce((a, b) => a + b, 0) - 100,
      ) < 0.001,
    );
    assert.equal(pc.metadata.recipe, "scree");
    assert.notEqual(pc.metadata.analysis.kind, r.metadata.analysis.kind);
  },
);
