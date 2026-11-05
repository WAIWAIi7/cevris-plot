import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { CATALOG } from "../shared/catalog.mjs";
import { RESEARCH } from "../shared/recipes-v4.mjs";
import { exampleProject } from "../shared/examples.mjs";
import { filterRecipes, recentRecipes } from "../shared/library.mjs";
import {
  parseProject,
  validateData,
  recommendations,
  suggestMapping,
} from "../server/model.mjs";
import {
  renderProject,
  closeRWorkers,
  RENDERER_SOURCE,
  ROOT,
  RSCRIPT,
} from "../server/runtime.mjs";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
test.after(() => closeRWorkers());
function fixture(id, rows, mapping) {
  const p = exampleProject(id);
  p.data = {
    name: "known input",
    columns: Object.keys(rows[0]),
    rows,
    synthetic: true,
  };
  p.originalData = structuredClone(p.data);
  p.mapping = mapping;
  return p;
}
const near = (a, b) => assert(Math.abs(a - b) < 0.0002, `${a} != ${b}`);
test("research examples map to valid inputs; domain errors are rejected", () => {
  for (const { id } of RESEARCH) {
    const check = validateData(parseProject(exampleProject(id)));
    assert(check.ok, `${id}: ${check.issues}`);
  }
  const bad = (id, edit) => {
    const p = parseProject(exampleProject(id));
    edit(p);
    assert(!validateData(p).ok, id);
  };
  bad("kaplan_meier", (p) => (p.data.rows[0][p.mapping.event] = 2));
  bad("kaplan_meier", (p) => p.data.rows.push({ ...p.data.rows[0] }));
  bad("clustered_heatmap", (p) => p.data.rows.pop());
  bad(
    "calendar_heatmap",
    (p) => (p.data.rows[0][p.mapping.date] = "2026-02-30"),
  );
  bad("calendar_heatmap", (p) => p.data.rows.push({ ...p.data.rows[0] }));
  bad("rarefaction", (p) => (p.data.rows[0][p.mapping.count] = 0.4));
  bad("genomic_intervals", (p) => (p.data.rows[0][p.mapping.start] = -1));
  bad("alluvial", (p) => (p.data.rows[0][p.mapping.value] = 0));
  bad("chord", (p) => p.data.rows.push({ ...p.data.rows[0] }));
  bad("parallel_coordinates", (p) => p.mapping.columns.push(p.mapping.subject));
  bad("cumulative_waterfall", (p) => (p.params.yMin = 10));
});
test("library search combines aliases, data forms, favorites and recent ordering", () => {
  assert(
    filterRecipes(CATALOG, { query: "KM" }).some(
      (r) => r.id === "kaplan_meier",
    ),
  );
  assert.deepEqual(
    filterRecipes(CATALOG, { query: "pca 双标" }).map((r) => r.id),
    ["pca_biplot"],
  );
  assert.equal(filterRecipes(CATALOG, { scope: "new" }).length, 41);
  assert.deepEqual(
    filterRecipes(CATALOG, { shape: "events" })
      .map((r) => r.id)
      .sort(),
    ["kaplan_meier", "swimmer"],
  );
  assert.equal(
    filterRecipes(CATALOG, { scope: "favorites", favorites: [] }).length,
    0,
  );
  assert.deepEqual(
    filterRecipes(CATALOG, {
      scope: "recent",
      recent: ["box", "rarefaction"],
      query: "",
    }).map((r) => r.id),
    ["box", "rarefaction"],
  );
  assert.equal(
    filterRecipes(CATALOG, { family: "数据分布", query: "KM" }).length,
    0,
  );
  assert.deepEqual(recentRecipes(["box", "scatter", "box"], "box"), [
    "box",
    "scatter",
  ]);
});
test("offline recommendations distinguish raw survival and count data; mapping excludes numeric identifiers", () => {
  const survival = exampleProject("kaplan_meier");
  assert.equal(recommendations(survival.data).results[0].id, "kaplan_meier");
  const counts = exampleProject("rarefaction");
  assert(
    recommendations(counts.data).results.some((r) => r.id === "rarefaction"),
  );
  const data = {
    columns: ["样本编号", "根长", "叶绿素"],
    rows: [
      { 样本编号: 1, 根长: 2, 叶绿素: 3 },
      { 样本编号: 2, 根长: 3, 叶绿素: 4 },
    ],
  };
  const m = suggestMapping("dendrogram", data);
  assert.equal(m.subject, "样本编号");
  assert.deepEqual(m.columns, ["根长", "叶绿素"]);
});
test(
  "Kaplan-Meier uses right censoring, keeps ties and reports known risk counts",
  { timeout: 40000 },
  async () => {
    const p = fixture(
      "kaplan_meier",
      [1, 2, 3, 4, 5].map((time, i) => ({
        id: String(i),
        time,
        event: [1, 1, 0, 1, 0][i],
      })),
      { subject: "id", time: "time", event: "event" },
    );
    const r = await renderProject(p),
      a = r.metadata.analysis,
      curve = a.curves["All"];
    assert.deepEqual(
      curve.map((r) => r.risk),
      [5, 5, 4, 3, 2, 1],
    );
    curve
      .map((r) => r.surv)
      .forEach((v, i) => near(v, [1, 0.8, 0.6, 0.6, 0.3, 0.3][i]));
    assert.equal(a.events, 3);
    assert.equal(a.censored, 2);
    for (const row of a.riskTable)
      assert.equal(
        row.risk,
        p.data.rows.filter((r) => r.time >= row.time).length,
      );
    // Event and censor at the same time are both in the pre-event risk set.
    p.data.rows = [
      { id: "a", time: 1, event: 1 },
      { id: "b", time: 1, event: 0 },
      { id: "c", time: 2, event: 1 },
    ];
    const tied = (await renderProject(p)).metadata.analysis.curves["All"];
    near(tied[1].surv, 2 / 3);
    assert.equal(tied[1].risk, 3);
    p.data.rows.forEach((r) => (r.event = 0));
    assert(
      (await renderProject(p)).metadata.analysis.curves["All"].every(
        (r) => r.surv === 1,
      ),
    );
  },
);
test(
  "rarefaction matches exhaustive hypergeometric expectation without mutating data",
  { timeout: 40000 },
  async () => {
    const p = fixture(
      "rarefaction",
      [
        { sample: "A", taxon: "x", count: 2 },
        { sample: "A", taxon: "y", count: 1 },
        { sample: "A", taxon: "z", count: 1 },
      ],
      { group: "sample", taxon: "taxon", count: "count" },
    );
    const before = JSON.stringify(p.data),
      a = (await renderProject(p)).metadata.analysis;
    assert.equal(JSON.stringify(p.data), before);
    assert.deepEqual(
      a.points.map((r) => r.x),
      [0, 1, 2, 3, 4],
    );
    a.points.forEach((r, i) => near(r.y, [0, 1, 11 / 6, 2.5, 3][i]));
  },
);
test(
  "clustering, paired intervals and cumulative balances preserve their numerical definitions",
  { timeout: 40000 },
  async () => {
    const p = fixture(
      "dendrogram",
      [
        { id: "a", a: 0, b: 0 },
        { id: "b", a: 0, b: 1 },
        { id: "c", a: 10, b: 10 },
      ],
      { subject: "id", columns: ["a", "b"] },
    );
    p.params.scalePca = false;
    const tree = (await renderProject(p)).metadata.analysis;
    near(tree.heights[0], 1);
    near(tree.heights[1], Math.sqrt(200));
    const pairs = fixture(
      "paired_difference",
      [2, 3, 4, 5].map((diff, i) => ({
        id: String(i),
        a: 10 + i,
        b: 10 + i + diff,
      })),
      { subject: "id", first: "a", second: "b" },
    );
    const a = (await renderProject(pairs)).metadata.analysis;
    near(a.mean, 3.5);
    near(a.lower, 3.5 - (3.182446 * Math.sqrt(5 / 3)) / 2);
    near(a.upper, 3.5 + (3.182446 * Math.sqrt(5 / 3)) / 2);
    const balance = fixture(
      "cumulative_waterfall",
      [
        { name: "A", delta: 5 },
        { name: "B", delta: -3 },
      ],
      { term: "name", value: "delta" },
    );
    balance.params.startValue = 8;
    const b = (await renderProject(balance)).metadata.analysis;
    assert.deepEqual(b.cumulative, [13, 10]);
    assert.equal(b.final, 10);
  },
);
test(
  "area and flow encodings conserve counts and retain tiny categories in legends",
  { timeout: 40000 },
  async () => {
    const p = fixture(
      "waffle",
      [
        { group: "a", value: 99.9 },
        { group: "b", value: 0.1 },
      ],
      { group: "group", value: "value" },
    );
    const result = await renderProject(p),
      a = result.metadata.analysis;
    assert.equal(
      Object.values(a.allocation).reduce((a, b) => a + b, 0),
      100,
    );
    assert.equal(a.allocation.b, 0);
    assert((await fs.readFile(result.file, "utf8")).includes("0.1%"));
    const chord = (await renderProject(exampleProject("chord"))).metadata
      .analysis;
    near(
      Object.values(chord.nodeTotals).reduce((a, b) => a + b, 0),
      chord.edgeTotal * 2,
    );
    const alluvial = (await renderProject(exampleProject("alluvial"))).metadata
      .analysis;
    assert(alluvial.stageTotals.every((n) => n === alluvial.total));
    const hex = (await renderProject(exampleProject("hexbin"))).metadata
      .analysis;
    assert.equal(
      hex.binCounts.reduce((n, r) => n + r.count, 0),
      1800,
    );
    const polar = fixture(
      "polar_histogram",
      [0, 360, 90, 180, 270].map((angle) => ({ angle })),
      { angle: "angle" },
    );
    polar.params.angleBins = 4;
    assert.deepEqual(
      (await renderProject(polar)).metadata.analysis.counts,
      [2, 1, 1, 1],
    );
  },
);
test(
  "expanded reproduction source runs a new recipe without the installed recipe files",
  { timeout: 40000 },
  async () => {
    const dir = await fs.mkdtemp(
      path.join(os.tmpdir(), "figure-research-repro-"),
    );
    const p = fixture(
      "rarefaction",
      [
        { s: "A", t: "one", n: 2 },
        { s: "A", t: "two", n: 3 },
      ],
      { group: "s", taxon: "t", count: "n" },
    );
    await fs.writeFile(path.join(dir, "renderer.R"), RENDERER_SOURCE);
    await fs.writeFile(
      path.join(dir, "input.json"),
      JSON.stringify(parseProject(p)),
    );
    await new Promise((resolve, reject) => {
      const child = spawn(
        RSCRIPT,
        [
          "--vanilla",
          path.join(dir, "renderer.R"),
          path.join(dir, "input.json"),
          path.join(dir, "result.svg"),
          "svg",
        ],
        {
          cwd: dir,
          windowsHide: true,
          env: {
            ...process.env,
            LC_ALL: "",
            LANG: "",
            R_LIBS_USER: path.join(ROOT, ".runtime/library"),
          },
        },
      );
      let error = "";
      child.stderr.on("data", (b) => (error += b));
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0 ? resolve() : reject(new Error(error)),
      );
    });
    const result = JSON.parse(
      await fs.readFile(path.join(dir, "result.svg.json"), "utf8"),
    );
    assert.equal(result.analysis.kind, "rarefaction");
    near(result.analysis.points.at(-1).y, 2);
  },
);
