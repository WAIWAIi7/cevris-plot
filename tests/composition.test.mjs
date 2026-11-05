import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { exampleProject } from "../shared/examples.mjs";
import {
  emptyComposition,
  addPanel,
  syncPanelSettings,
} from "../shared/composition.mjs";
import {
  NUMBERED_RECIPES,
  chartNumber,
  normalizeHomeSelection,
  HOME_RECIPES,
  resolveHomeSelection,
} from "../shared/home.mjs";
import { CATALOG } from "../shared/catalog.mjs";
import { parseComposition, renderComposition } from "../server/composition.mjs";
import { exportR } from "../server/r-export.mjs";
import {
  ROOT,
  RSCRIPT,
  closeRWorkers,
  renderProject,
} from "../server/runtime.mjs";
test.after(() => closeRWorkers());
const fixture = () => {
  let c = emptyComposition();
  for (const [i, id] of ["bar", "bar", "raincloud", "heatmap"].entries())
    c = addPanel(c, exampleProject(id), "panel" + i);
  return c;
};
await fs.mkdir(path.join(ROOT, "verification"), { recursive: true });

test("fixed chart identifiers cover the catalog; owner curation replaces legacy empty homes without overwriting personal choices", () => {
  assert.equal(new Set(NUMBERED_RECIPES).size, CATALOG.length);
  assert(CATALOG.every((r) => chartNumber(r.id)));
  assert.equal(chartNumber("bar"), "001");
  assert.equal(chartNumber("raincloud"), "054");
  assert.equal(chartNumber("volcano"), "096");
  assert.deepEqual(HOME_RECIPES.map(chartNumber), [
    "011",
    "035",
    "054",
    "058",
    "071",
    "073",
    "077",
    "102",
  ]);
  assert.deepEqual(resolveHomeSelection([]), HOME_RECIPES);
  assert.deepEqual(resolveHomeSelection(null), HOME_RECIPES);
  assert.deepEqual(resolveHomeSelection(["volcano", "bar"]), [
    "volcano",
    "bar",
  ]);
  assert.deepEqual(resolveHomeSelection({ version: 1, ids: [] }), []);
  assert.deepEqual(
    resolveHomeSelection({ version: 1, ids: ["bar", "bad", "bar"] }),
    ["bar"],
  );
  assert.deepEqual(
    normalizeHomeSelection(["volcano", "bar", "volcano", "unknown"]),
    ["volcano", "bar"],
  );
});
test("same-type settings sync preserves measurements, identities, labels, unrelated plots and scientific choices by default", () => {
  const c = fixture(),
    first = c.panels[0].project,
    second = c.panels[1].project;
  first.params.linewidth = 1;
  first.params.fontSize = 15;
  first.params.errorType = "sem";
  first.params.yMax = 200;
  first.colors.Control = "#123456";
  second.data.rows[0]["Root length"] = 83.17;
  second.labels.y = "Independent measurement";
  const before = structuredClone(c),
    out = syncPanelSettings(c, "panel0");
  assert.deepEqual(c, before);
  assert.equal(out.panels[1].project.params.linewidth, 1);
  assert.equal(out.panels[1].project.params.fontSize, 15);
  assert.equal(out.panels[1].project.params.errorType, "sd");
  assert.equal(out.panels[1].project.params.yMax, null);
  assert.equal(out.panels[1].project.colors.Control, "#123456");
  assert.deepEqual(out.panels[1].project.data, second.data);
  assert.deepEqual(out.panels[1].project.labels, second.labels);
  assert.deepEqual(out.panels[2], c.panels[2]);
  assert.equal(
    syncPanelSettings(c, "panel0", true).panels[1].project.params.errorType,
    "sem",
  );
});
test("composition validates each dataset and rejects clipped or excessive raster layouts", async () => {
  const c = fixture();
  assert.equal(parseComposition(c).panels.length, 4);
  c.panels[1].id = "panel0";
  assert.throws(() => parseComposition(c), /Duplicate/);
  const small = fixture();
  small.layout.heightMm = 80;
  small.layout.marginMm = 30;
  assert.throws(() => parseComposition(small), /small/);
  const huge = fixture();
  huge.layout.widthMm = 600;
  huge.layout.heightMm = 600;
  huge.layout.dpi = 600;
  await assert.rejects(renderComposition(huge, "png"), /megapixels/);
});
test("outlined grouped bars show one legend entry per series", async () => {
  const p = exampleProject("grouped_bar_plain");
  const r = await renderProject(p, "svg");
  const svg = await fs.readFile(r.file, "utf8");
  assert.equal((svg.match(/>Cultivar A<\/text>/g) || []).length, 1);
  assert.equal((svg.match(/>Cultivar B<\/text>/g) || []).length, 1);
});
test("R composition keeps native vector text, panel values and raincloud analysis across SVG/PDF/PNG/TIFF", async () => {
  const c = fixture();
  for (const format of ["svg", "pdf", "png", "tiff"]) {
    const r = await renderComposition(c, format),
      bytes = await fs.readFile(r.file);
    assert(bytes.length > 1000);
    assert.equal(r.metadata.panels.length, 4);
    assert.equal(r.metadata.panels[2].recipe, "raincloud");
    assert.equal(
      r.metadata.panels[2].rows,
      c.panels[2].project.data.rows.length,
    );
    assert.equal(r.metadata.widthMm, 320);
    assert(
      !r.metadata.panels.some((p) =>
        (p.warnings || []).some((w) => w.includes("PostScript")),
      ),
    );
    if (format === "svg") {
      assert(bytes.toString().includes("<text"));
      assert(
        bytes.toString().includes("<circle"),
      ); /* Continuous colour-bar legends may use a raster gradient. */
    }
  }
});
test("standalone R source runs single and composed figures outside the app with no sibling recipe files", async () => {
  const folder = await fs.mkdtemp(path.join(ROOT, "verification", "r-source-"));
  const p = exampleProject("raincloud");
  p.labels.note = 'Literal )----" data';
  for (const spec of [p, fixture()]) {
    const script = path.join(folder, spec.kind ? "composition.R" : "single.R");
    await fs.writeFile(script, exportR(spec));
    await promisify(execFile)(RSCRIPT, ["--vanilla", script], {
      cwd: folder,
      windowsHide: true,
      env: { ...process.env, R_LIBS_USER: path.join(ROOT, ".runtime/library") },
      timeout: 30000,
    });
    const output = path.join(
        folder,
        spec.kind ? "composition.svg" : "figure.svg",
      ),
      svg = await fs.readFile(output, "utf8");
    assert(svg.includes("<svg"));
    const metadata = JSON.parse(await fs.readFile(output + ".json", "utf8"));
    assert.equal(
      spec.kind ? metadata.panels.length : metadata.rows,
      spec.kind ? 4 : p.data.rows.length,
    );
  }
});
