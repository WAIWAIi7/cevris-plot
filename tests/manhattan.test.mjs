import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { exampleProject } from "../shared/examples.mjs";
import { parseProject, validateData } from "../server/model.mjs";
import { exportR } from "../server/r-export.mjs";
import {
  renderProject,
  closeRWorkers,
  ROOT,
  RSCRIPT,
} from "../server/runtime.mjs";

test.after(() => closeRWorkers());
await fs.mkdir(path.join(ROOT, "verification"), { recursive: true });

test(
  "large standalone R export parses promptly and preserves all embedded observations",
  { timeout: 45000 },
  async () => {
    const p = exampleProject("manhattan");
    // Exercise raw-string delimiter collisions without executing user strings.
    p.context += ' Literal )----" and emoji 🌱.';
    const folder = await fs.mkdtemp(
      path.join(ROOT, "verification", "r-manhattan-"),
    );
    const script = path.join(folder, "figure.R");
    await fs.writeFile(script, exportR(p));
    await promisify(execFile)(RSCRIPT, ["--vanilla", script], {
      cwd: folder,
      windowsHide: true,
      env: { ...process.env, R_LIBS_USER: path.join(ROOT, ".runtime/library") },
      timeout: 40000,
    });
    const svg = await fs.readFile(path.join(folder, "figure.svg"), "utf8");
    const metadata = JSON.parse(
      await fs.readFile(path.join(folder, "figure.svg.json"), "utf8"),
    );
    assert.equal(metadata.rows, 24000);
    assert.equal((svg.match(/<circle /g) || []).length, 24000);
  },
);
test("dense synthetic GWAS example is reproducible, valid and spatially clustered", () => {
  const p = parseProject(exampleProject("manhattan")),
    rows = p.data.rows;
  assert.equal(rows.length, 24000);
  assert.equal(p.data.synthetic, true);
  assert.deepEqual(rows, exampleProject("manhattan").data.rows);
  assert.equal(new Set(rows.map((r) => r.Chromosome)).size, 12);
  assert.equal(new Set(rows.map((r) => r.Variant)).size, rows.length);
  assert(rows.every((r) => r.P > 0 && r.P <= 1 && r.Position > 0));
  assert(rows.filter((r) => r.P >= 0.01).length > rows.length * 0.9);
  const peaks = rows.filter((r) => r.P < p.params.associationThreshold);
  assert(peaks.length > 40 && peaks.length < 1000);
  assert(
    peaks.filter(
      (r) =>
        r.Chromosome === "3" &&
        Math.abs(r.Position - 36400000 * 0.37) < 1000000,
    ).length > 15,
  );
  assert.equal(validateData(p).ok, true);
});

test(
  "R renders every GWAS point, honours point size, and never expands imported measurements",
  { timeout: 60000 },
  async () => {
    const p = exampleProject("manhattan");
    const out = await renderProject(p, "svg");
    const svg = await fs.readFile(out.file, "utf8");
    assert.equal(out.metadata.rows, 24000);
    assert.equal((svg.match(/<circle /g) || []).length, 24000);
    assert.equal(out.metadata.fontUsed, "Times New Roman");
    assert.equal(out.metadata.linewidth, 0.5);
    assert(!/[\u4e00-\u9fff]/u.test(svg));
    await fs.mkdir(path.join(ROOT, "build", "thumbnails"), { recursive: true });
    await fs.copyFile(
      out.file,
      path.join(ROOT, "build", "thumbnails", "manhattan.svg"),
    );
    p.data.rows = [p.data.rows[0], p.data.rows[4000], p.data.rows[21000]];
    p.data.synthetic = false;
    p.originalData = structuredClone(p.data);
    const before = structuredClone(p.data.rows);
    const small = await renderProject(p, "svg");
    p.params.pointSize = 1.2;
    const large = await renderProject(p, "svg");
    assert.equal(large.metadata.rows, 3);
    assert.equal(
      (String(await fs.readFile(large.file)).match(/<circle /g) || []).length,
      3,
    );
    assert.notEqual(
      await fs.readFile(small.file, "utf8"),
      await fs.readFile(large.file, "utf8"),
    );
    assert.deepEqual(p.data.rows, before);
  },
);
