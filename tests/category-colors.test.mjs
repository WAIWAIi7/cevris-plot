import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { exampleProject } from "../shared/examples.mjs";
import {
  reconcileColors,
  parseProject,
  validateData,
} from "../server/model.mjs";
import { PALETTES, applyPalette, matchesPalette } from "../shared/palettes.mjs";
import { categoricalColors } from "../shared/palette-scale.mjs";
import { renderProject, closeRWorkers } from "../server/runtime.mjs";
import {
  addPanel,
  emptyComposition,
  syncPanelSettings,
} from "../shared/composition.mjs";
test.after(() => closeRWorkers());
const preset = PALETTES.find((p) => p.id === "ocean-coral");
function sample(n) {
  const p = parseProject(exampleProject("bar"));
  p.colors = {};
  p.groupOrder = [];
  p.name = "Variable category demo";
  p.data = {
    name: "Synthetic category counts",
    columns: ["Treatment", "Response"],
    synthetic: true,
    rows: Array.from({ length: n }, (_, i) =>
      Array.from({ length: 6 }, (_, j) => ({
        Treatment: `Group ${String(i + 1).padStart(2, "0")}`,
        Response: +(
          15 +
          5 * Math.sin(i * 1.4) +
          [0.73, -1.24, 2.19, -0.61, 1.43, -1.8][j] +
          i * 0.27
        ).toFixed(2),
      })),
    ).flat(),
  };
  p.originalData = structuredClone(p.data);
  p.mapping = { group: "Treatment", value: "Response" };
  return reconcileColors(p);
}
test("all categorical presets extend deterministically without cycling from 2 through 100 categories", () => {
  for (const palette of PALETTES.filter((p) => p.kind === "categorical")) {
    const all = categoricalColors(palette.colors, 100);
    assert.equal(new Set(all).size, 100, palette.id);
    assert.deepEqual(all.slice(0, palette.colors.length), palette.colors);
    for (const n of [2, 3, 5, 8, 12, 20, 100]) {
      const p = sample(n);
      applyPalette(p, palette);
      assert.equal(
        new Set(p.groupOrder.map((g) => p.colors[g])).size,
        n,
        palette.id,
      );
      assert(matchesPalette(reconcileColors(parseProject(p)), palette));
      assert.deepEqual(categoricalColors(palette.colors, n), all.slice(0, n));
    }
  }
});
test("adding, filtering, reordering and renaming groups preserves existing identities and the chosen preset", () => {
  let p = sample(4);
  applyPalette(p, preset);
  const original = { ...p.colors };
  p.data = sample(12).data;
  p = reconcileColors(p);
  for (const [name, color] of Object.entries(original))
    assert.equal(p.colors[name], color);
  assert.equal(new Set(p.groupOrder.map((g) => p.colors[g])).size, 12);
  assert(matchesPalette(p, preset));
  const all = structuredClone(p),
    rows = structuredClone(p.data.rows);
  p.data.rows = p.data.rows.filter((r) =>
    ["Group 01", "Group 03"].includes(r.Treatment),
  );
  p = reconcileColors(p);
  assert.equal(p.groupOrder.length, 2);
  p.groupOrder.reverse();
  p.data.rows.reverse();
  p = reconcileColors(p);
  assert.equal(p.colors["Group 03"], all.colors["Group 03"]);
  assert(matchesPalette(p, preset));
  p.data.rows = rows;
  p = reconcileColors(parseProject(JSON.parse(JSON.stringify(p))));
  assert.deepEqual(p.colors, all.colors);
  p.data.rows.forEach((r) => {
    if (r.Treatment === "Group 03") r.Treatment = "Renamed treatment";
  });
  p = reconcileColors(p);
  assert(p.groupOrder.includes("Renamed treatment"));
  assert.equal(p.colors["Group 01"], original["Group 01"]);
  assert.equal(new Set(p.groupOrder.map((g) => p.colors[g])).size, 12);
  const custom = "#163E4A";
  p.colors["Group 01"] = custom;
  p.data.rows.push(
    { Treatment: "__proto__", Response: 12.3 },
    { Treatment: "constructor", Response: 18.4 },
  );
  p = reconcileColors(p);
  assert.equal(p.colors["Group 01"], custom);
  assert(/^#[0-9A-F]{6}$/.test(p.colors.__proto__));
  assert(Object.hasOwn(p.colors, "constructor"));
});
test("composition sync matches semantic names when panels have different category counts", () => {
  const a = sample(2),
    b = sample(5);
  applyPalette(a, preset);
  a.colors["Group 01"] = "#123456";
  const c = addPanel(addPanel(emptyComposition(), a, "a"), b, "b"),
    out = syncPanelSettings(c, "a");
  assert.deepEqual(out.panels[1].project.data, b.data);
  assert.equal(out.panels[1].project.colors["Group 01"], "#123456");
  assert.equal(out.panels[1].project.colors["Group 05"], b.colors["Group 05"]);
  assert.equal(out.panels[1].project.paletteId, preset.id);
});
test("grouped bars color the series and stacked bars color components, rather than x-axis category positions", () => {
  for (const id of ["grouped_bar", "grouped_stacked_bar"]) {
    let p = parseProject(exampleProject(id));
    const field = p.mapping.component || p.mapping.series;
    p.colors = {};
    p.groupOrder = [];
    p.data.rows = Array.from({length: 9}, (_,i) => ({...p.data.rows[0], [field]: `Series ${i+1}`}));
    p = reconcileColors(p);
    applyPalette(p,preset);
    assert.equal(p.groupOrder.length,9);
    assert.equal(new Set(p.groupOrder.map(g=>p.colors[g])).size,9);
  }
});
test("actual R exports retain all categories and the extended palette for 2, 5, 8 and 12 groups", async () => {
  for (const n of [2, 5, 8, 12]) {
    const p = sample(n);
    applyPalette(p, preset);
    p.params.axisAngle = "45";
    const r = await renderProject(p, "svg"),
      svg = await fs.readFile(r.file, "utf8");
    assert(validateData(p).ok);
    assert.equal(r.metadata.rows, n * 6);
    for (const g of p.groupOrder) {
      assert(svg.includes(g));
      assert(svg.includes(p.colors[g]));
    }
  }
});
