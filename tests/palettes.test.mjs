import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { csv } from "../server/import.mjs";
import { ROOT } from "../server/runtime.mjs";
import {
  PALETTES,
  applyPalette,
  paletteKind,
  paletteAvailability,
  matchesPalette,
} from "../shared/palettes.mjs";
import { CATALOG } from "../shared/catalog.mjs";
import { exampleProject } from "../shared/examples.mjs";
import {
  reconcileColors,
  parseProject,
  validateData,
} from "../server/model.mjs";
import { renderProject, closeRWorkers } from "../server/runtime.mjs";
test.after(() => closeRWorkers());
const sample = (id) => reconcileColors(parseProject(exampleProject(id)));
const palette = (id) => PALETTES.find((p) => p.id === id);
test("agent CLI discovers palettes and writes the same editable colors, rejecting unknown IDs", async () => {
  const run = promisify(execFile);
  const list = await run(process.execPath, ["scripts/figure.mjs", "palettes"], {
    cwd: ROOT,
    windowsHide: true,
  });
  assert.equal(JSON.parse(list.stdout).length, 28);
  await fs.mkdir(path.join(ROOT, "verification"), { recursive: true });
  const dir = await fs.mkdtemp(path.join(ROOT, "verification", "palette-cli-"));
  const p = sample("bar"),
    input = path.join(dir, "data.csv"),
    spec = path.join(dir, "spec.json"),
    output = path.join(dir, "result.figure.json");
  await fs.writeFile(input, csv(p.data));
  const specification = {
    input: "data.csv",
    recipeId: p.recipeId,
    mapping: p.mapping,
    synthetic: true,
    palette: "ocean-coral",
  };
  await fs.writeFile(spec, JSON.stringify(specification));
  await run(
    process.execPath,
    ["scripts/figure.mjs", "create", "--spec", spec, "--out", output],
    { cwd: ROOT, windowsHide: true },
  );
  const saved = parseProject(JSON.parse(await fs.readFile(output, "utf8")));
  assert(matchesPalette(saved, palette("ocean-coral")));
  specification.palette = "unknown";
  await fs.writeFile(spec, JSON.stringify(specification));
  await assert.rejects(
    run(
      process.execPath,
      [
        "scripts/figure.mjs",
        "create",
        "--spec",
        spec,
        "--out",
        path.join(dir, "invalid.json"),
      ],
      { cwd: ROOT, windowsHide: true },
    ),
    /Unknown palette/,
  );
  await assert.rejects(fs.access(path.join(dir, "invalid.json")));
});
const luminance = (hex) => {
  const c = hex
    .slice(1)
    .match(/../g)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

test("palette library adds sixteen distinct categorical schemes and ordered lightness scales", () => {
  assert.equal(PALETTES.length, 28);
  assert.equal(
    PALETTES.filter((p) => !p.legacy && p.kind === "categorical").length,
    16,
  );
  assert.equal(new Set(PALETTES.map((p) => p.id)).size, PALETTES.length);
  assert.equal(
    new Set(PALETTES.map((p) => p.colors.join())).size,
    PALETTES.length,
  );
  for (const p of PALETTES) {
    assert(p.colors.every((c) => /^#[0-9A-F]{6}$/.test(c)));
    assert.equal(new Set(p.colors).size, p.colors.length);
    if (p.kind === "sequential")
      assert(
        luminance(p.colors[0]) > luminance(p.colors[1]) &&
          luminance(p.colors[1]) > luminance(p.colors[2]),
      );
    if (p.kind === "diverging") {
      assert(luminance(p.colors[1]) > 0.8);
      assert(luminance(p.colors[0]) < 0.3 && luminance(p.colors[2]) < 0.3);
    }
  }
});

test("applying a palette preserves all scientific inputs, works across the catalog and survives project serialization", () => {
  for (const r of CATALOG) {
    const p = sample(r.id),
      before = structuredClone(p);
    const available = PALETTES.filter((c) => !paletteAvailability(p, c));
    for (const c of available) {
      const changed = applyPalette(structuredClone(p), c);
      assert(matchesPalette(changed, c), r.id);
      const reopened = reconcileColors(
        parseProject(JSON.parse(JSON.stringify(changed))),
      );
      assert.deepEqual(reopened.colors, changed.colors, r.id);
      assert.deepEqual(reopened.params, changed.params, r.id);
      assert(validateData(reopened).ok, r.id);
      changed.colors = before.colors;
      changed.paletteId = before.paletteId;
      for (const key of ["fillColor", "colorLow", "colorMid", "colorHigh"])
        changed.params[key] = before.params[key];
      assert.deepEqual(changed, before, r.id + " only colors change");
    }
  }
});

test("capacity, semantic volcano groups, group reorder and zero-centered scales cannot silently change", () => {
  const p = sample("bar");
  p.groupOrder = Array.from({ length: 101 }, (_, i) => `Group ${i}`);
  const before = structuredClone(p);
  assert.throws(() => applyPalette(p, palette("ocean-coral")), /capacity/);
  assert.deepEqual(p, before);
  const volcano = sample("volcano");
  volcano.groupOrder.reverse();
  applyPalette(volcano, palette("ocean-coral"));
  assert.equal(volcano.colors.Down, "#355C7D");
  assert.equal(volcano.colors.Up, "#D57868");
  assert.equal(volcano.colors["Not significant"], "#A8ADB4");
  const colors = structuredClone(volcano.colors);
  volcano.groupOrder.reverse();
  assert.deepEqual(reconcileColors(volcano).colors, colors);
  const heatmap = sample("heatmap");
  heatmap.params.normalization = "row_z";
  assert.equal(paletteKind(heatmap), "diverging");
  assert.throws(() => applyPalette(heatmap, palette("seq-ocean")), /kind/);
  applyPalette(heatmap, palette("div-teal-rose"));
  assert.equal(heatmap.params.normalization, "row_z");
});

test(
  "R exports use new colors without changing raincloud observations or numerical summaries",
  { timeout: 60000 },
  async () => {
    for (const id of ["bar", "raincloud", "volcano", "heatmap"]) {
      const p = sample(id),
        base = await renderProject(p);
      applyPalette(p, palette(id === "heatmap" ? "seq-ocean" : "ocean-coral"));
      const r = await renderProject(p),
        svg = await fs.readFile(r.file, "utf8");
      assert.equal(r.metadata.fontUsed, "Times New Roman");
      assert.deepEqual(r.metadata.analysis, base.metadata.analysis, id);
      assert.equal(r.metadata.rows, base.metadata.rows, id);
      assert.notEqual(svg, await fs.readFile(base.file, "utf8"), id);
      if (id !== "heatmap") {
        assert(svg.includes("#355C7D"), id);
        assert(svg.includes("#D57868"), id);
      } else assert(svg.includes("#214C67"));
      if (id === "volcano") assert(svg.includes("#A8ADB4"));
    }
  },
);
