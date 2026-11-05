import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { parseProject, validateData, reconcileColors } from "./model.mjs";
import { createRPool } from "./r-workers.mjs";
export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const DATA = path.resolve(
  process.env.FIGURE_DATA_DIR || path.join(ROOT, ".data"),
);
const configuredR =
  process.env.FIGURE_RSCRIPT ||
  path.join(
    ROOT,
    ".runtime",
    "R",
    "bin",
    process.platform === "win32" ? "Rscript.exe" : "Rscript",
  );
// Windows bin/Rscript.exe is a launcher that spawns bin/x64/Rscript.exe.
// Use the actual interpreter so timeouts and shutdown also stop computation.
const directR = path.join(path.dirname(configuredR), "x64", "Rscript.exe");
export const RSCRIPT = process.platform === "win32" &&
  await fs.access(directR).then(() => true, () => false) ? directR : configuredR;
export const hash = (value) =>
  createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex");
const rendererMain = await fs.readFile(
  path.join(ROOT, "r", "renderer.R"),
  "utf8",
);
export const RENDERER_SOURCE = rendererMain
  .replace(
    "# INLINE_COMPOSITION",
    await fs.readFile(path.join(ROOT, "r", "composition.R"), "utf8"),
  )
  .replace(
    "# INLINE_RAINCLOUD_PACK",
    await fs.readFile(path.join(ROOT, "r", "raincloud.R"), "utf8"),
  )
  .replace(
    "# INLINE_RECIPE_PACK",
    await fs.readFile(path.join(ROOT, "r", "recipes-v3.R"), "utf8"),
  )
  .replace(
    "# INLINE_RESEARCH_PACK",
    await fs.readFile(path.join(ROOT, "r", "recipes-v4.R"), "utf8"),
  )
  .replace(
    "# INLINE_VARIANT_PACK",
    await fs.readFile(path.join(ROOT, "r", "recipes-v6.R"), "utf8"),
  );
const rendererVersion = hash(RENDERER_SOURCE);
// Workers execute this process's immutable source snapshot, including during development.
const rendererSnapshot = path.join(
  DATA,
  "engines",
  rendererVersion + "-" + process.pid + ".R",
);
await fs.mkdir(path.dirname(rendererSnapshot), { recursive: true });
await fs.writeFile(rendererSnapshot, RENDERER_SOURCE);
export async function writeJSON(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = file + "." + randomUUID() + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(value, null, 2));
  await fs.rename(tmp, file);
}
export async function readJSON(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}
const rPool = createRPool({
  executable: RSCRIPT,
  script: rendererSnapshot,
  cwd: ROOT,
  env: {
    ...process.env,
    LC_ALL: "",
    LANG: "",
    R_LIBS_USER: path.join(ROOT, ".runtime", "library"),
  },
});
export const closeRWorkers = () => rPool.close();
export const prewarmRWorkers = () =>
  Promise.all([rPool.run(["--warmup"]), rPool.run(["--warmup"])]);
export function runR(args, timeout = 90000) {
  if (args[0] !== "--diagnostics") return rPool.run(args, timeout);
  return new Promise((resolve, reject) => {
    const child = spawn(RSCRIPT, ["--vanilla", rendererSnapshot, ...args], {
      cwd: ROOT,
      windowsHide: true,
      env: {
        ...process.env,
        LC_ALL: "",
        LANG: "",
        R_LIBS_USER: path.join(ROOT, ".runtime", "library"),
      },
    });
    let stdout = "",
      stderr = "",
      settled = false;
    const timer = setTimeout(() => {
      settled = true;
      child.kill();
      reject(new Error("绘图超过90秒，请减少数据量后重试"));
    }, timeout);
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      if (!settled)
        reject(new Error("R 环境不可用，请运行首次安装。" + e.message));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (settled) return;
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.slice(-3500) || "R 绘图失败"));
    });
  });
}
export async function diagnostics() {
  try {
    const r = await runR(["--diagnostics"]);
    return { ready: true, ...JSON.parse(r.stdout) };
  } catch (e) {
    return { ready: false, error: e.message };
  }
}
export function renderKey(p, format) {
  return hash({
    rendererVersion,
    recipe: p.recipeId,
    data: p.data.rows,
    mapping: p.mapping,
    params: p.params,
    colors: p.colors,
    labels: p.labels,
    order: p.groupOrder,
    format,
  });
}
const inFlight = new Map();
export async function renderProject(raw, format = "svg") {
  const p = reconcileColors(parseProject(raw)),
    key = renderKey(p, format);
  if (!inFlight.has(key))
    inFlight.set(
      key,
      renderOnce(p, format).finally(() => inFlight.delete(key)),
    );
  const result = await inFlight.get(key),
    check = validateData(p);
  const rendererWarnings =
    result.metadata.rendererWarnings ??
    result.metadata.warnings.filter(
      (w) =>
        !w.startsWith("当前使用模拟") &&
        !w.startsWith("本次绘图排除") &&
        !w.startsWith("当前使用原始显著性"),
    );
  return {
    ...result,
    check,
    project: p,
    metadata: {
      ...result.metadata,
      projectRevision: p.revision,
      warnings: [...check.warnings, ...rendererWarnings],
    },
  };
}
async function renderOnce(raw, format = "svg") {
  if (!["svg", "png", "pdf", "tiff"].includes(format))
    throw new Error("不支持的导出格式");
  const p = reconcileColors(parseProject(raw)),
    check = validateData(p);
  if (!check.ok) throw new Error(check.issues.join("；"));
  const key = renderKey(p, format),
    dir = path.join(DATA, "renders"),
    file = path.join(dir, key + "." + format);
  await fs.mkdir(dir, { recursive: true });
  try {
    const metadata = await readJSON(file + ".json");
    await fs.access(file);
    return { key, file, format, metadata, check, project: p };
  } catch {}
  const input = path.join(dir, key + ".input.json");
  await writeJSON(input, p);
  const timing = await runR([input, file, format]);
  const metadata = await readJSON(file + ".json");
  metadata.inputHash = hash(p.data.rows);
  metadata.rendererHash = rendererVersion;
  metadata.projectRevision = p.revision;
  metadata.createdAt = new Date().toISOString();
  metadata.renderMs = timing.renderMs;
  metadata.warmWorker = timing.warm;
  metadata.rendererWarnings = Array.isArray(metadata.warnings)
    ? metadata.warnings
    : metadata.warnings
      ? [metadata.warnings]
      : [];
  metadata.warnings = [...check.warnings, ...metadata.rendererWarnings];
  await writeJSON(file + ".json", metadata);
  return { key, file, format, metadata, check, project: p };
}
const jobs = new Map(),
  queue = [];
let active = 0;
export function enqueue(project, format) {
  if (queue.length > 40) throw new Error("待处理任务过多，请稍后重试");
  const id = randomUUID(),
    job = { id, status: "queued", created: Date.now() };
  jobs.set(id, job);
  queue.push({ job, project, format });
  pump();
  return job;
}
function pump() {
  while (active < 2 && queue.length) {
    const { job, project, format } = queue.shift();
    active++;
    job.status = "running";
    renderProject(project, format)
      .then(
        (r) =>
          Object.assign(job, {
            status: "done",
            url: "/api/files/" + r.key + "." + format,
            metadata: r.metadata,
            check: r.check,
            revision: project.revision,
          }),
        (e) => Object.assign(job, { status: "error", error: e.message }),
      )
      .finally(() => {
        active--;
        pump();
      });
  }
  for (const [id, j] of jobs)
    if (
      j.created < Date.now() - 3600000 &&
      !["running", "queued"].includes(j.status)
    )
      jobs.delete(id);
}
export const getJob = (id) => jobs.get(id);
