import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { CATALOG, PARAMS } from "../shared/catalog.mjs";
import { PALETTES, applyPalette } from "../shared/palettes.mjs";
import { exportR } from "../server/r-export.mjs";
import { exampleProject } from "../shared/examples.mjs";
import { isCompatibleApp } from "../shared/identity.mjs";
import {
  parseProject,
  validateData,
  suggestMapping,
  reconcileColors,
  recommendations,
  transform,
} from "../server/model.mjs";
import { importFile, csv } from "../server/import.mjs";
import {
  diagnostics,
  renderProject,
  writeJSON,
  readJSON,
  ROOT,
} from "../server/runtime.mjs";
const [command, ...args] = process.argv.slice(2),
  options = {};
for (let i = 0; i < args.length; i++) {
  if (!args[i].startsWith("--") || !args[i + 1] || args[i + 1].startsWith("--"))
    throw new Error("参数需要使用 --名称 值");
  options[args[i].slice(2)] = args[++i];
}
const required = (key) => {
  if (!options[key]) throw new Error("缺少 --" + key);
  return options[key];
};
const table = async (file, sheet) =>
  importFile({
    name: path.basename(file),
    base64: (await fs.readFile(file)).toString("base64"),
    sheet,
    encoding: options.encoding || "utf-8",
  });
const emit = (value) => console.log(JSON.stringify(value, null, 2));
async function createFromSpec(specPath) {
  const spec = await readJSON(specPath);
  if (!spec.input || !spec.recipeId)
    throw new Error("spec 需要 input 与 recipeId");
  const input = path.resolve(path.dirname(path.resolve(specPath)), spec.input);
  const imported = await table(input, spec.sheet),
    data = imported.data;
  data.synthetic = spec.synthetic === true;
  const p = reconcileColors(
    parseProject({
      schemaVersion: 1,
      id: null,
      revision: 0,
      name: spec.name || path.parse(input).name,
      recipeId: spec.recipeId,
      context: spec.context || "",
      data,
      originalData: structuredClone(data),
      mapping: spec.mapping || suggestMapping(spec.recipeId, data),
      params: { ...exampleProject(spec.recipeId).params, ...spec.params },
      labels: {
        title: spec.name || path.parse(input).name,
        x: "",
        y: "",
        note: "",
        ...spec.labels,
      },
      colors: spec.colors || {},
      groupOrder: spec.groupOrder || [],
      transforms: [],
    }),
  );
  if (spec.palette) {
    const palette = PALETTES.find((item) => item.id === spec.palette);
    if (!palette) throw new Error("Unknown palette: " + spec.palette);
    applyPalette(p, palette);
    // Explicit colors override preset defaults. They were validated above.
    Object.assign(p.colors, spec.colors || {});
    for (const key of ["fillColor", "colorLow", "colorMid", "colorHigh"])
      if (spec.params?.[key] !== undefined) p.params[key] = spec.params[key];
  }
  const check = validateData(p);
  if (!check.ok) throw new Error(check.issues.join("；"));
  return p;
}
try {
  if (command === "catalog")
    emit({
      engine: "R-first",
      recipes: CATALOG,
      params: PARAMS,
      palettes: PALETTES,
    });
  else if (command === "palettes") emit(PALETTES);
  else if (command === "export-r") {
    const output = path.resolve(required("out"));
    if (path.extname(output).toLowerCase() !== ".r")
      throw new Error("Use an .R file extension");
    const source = exportR(await readJSON(required("project")));
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, source);
    emit({ file: output, standalone: true });
  } else if (command === "doctor") emit(await diagnostics());
  else if (command === "inspect") {
    const r = await table(required("input"), options.sheet);
    emit({
      sheets: r.sheets,
      rows: r.data.rows.length,
      profile: r.profile,
      preview: r.data.rows.slice(0, 8),
      recommendations: recommendations(r.data, options.context || ""),
    });
  } else if (command === "example") {
    const p = exampleProject(required("recipe"));
    if (options.out) {
      await fs.mkdir(path.dirname(path.resolve(options.out)), {
        recursive: true,
      });
      if (options.out.endsWith(".csv"))
        await fs.writeFile(options.out, csv(p.data));
      else await writeJSON(options.out, p);
      emit({ file: path.resolve(options.out), synthetic: true });
    } else emit(p);
  } else if (command === "create") {
    const p = await createFromSpec(required("spec"));
    const check = validateData(p);
    await writeJSON(required("out"), p);
    emit({
      file: path.resolve(options.out),
      mapping: p.mapping,
      check,
      notice: "请结合实验背景确认列含义；自动匹配不代替实验设计判断。",
    });
  } else if (command === "draw") {
    const p = await createFromSpec(required("spec"));
    const out = path.resolve(required("out"));
    const format =
      options.format || path.extname(out).slice(1).toLowerCase() || "png";
    if (!["svg", "png", "pdf", "tiff"].includes(format))
      throw new Error("Use svg, png, pdf or tiff output.");
    const figure = await renderProject(p, format);
    await fs.mkdir(path.dirname(out), { recursive: true });
    const projectFile = path.join(
      path.dirname(out),
      path.parse(out).name + ".figure.json",
    );
    await fs.copyFile(figure.file, out);
    await writeJSON(projectFile, p);
    await writeJSON(out + ".json", figure.metadata);
    emit({
      file: out,
      project: projectFile,
      metadata: figure.metadata,
      next: { command: "open", project: projectFile },
    });
  } else if (command === "validate") {
    const p = parseProject(await readJSON(required("project"))),
      check = validateData(p);
    emit(check);
    if (!check.ok) process.exitCode = 1;
  } else if (command === "transform") {
    const p = transform(
      parseProject(await readJSON(required("project"))),
      await readJSON(required("action")),
    );
    await writeJSON(required("out"), p);
    emit({ file: path.resolve(options.out), check: validateData(p) });
  } else if (command === "render") {
    const p = parseProject(await readJSON(required("project"))),
      r = await renderProject(p, options.format || "svg");
    if (options.out) {
      await fs.mkdir(path.dirname(path.resolve(options.out)), {
        recursive: true,
      });
      await fs.copyFile(r.file, options.out);
      await writeJSON(options.out + ".json", r.metadata);
    }
    emit({ file: path.resolve(options.out || r.file), metadata: r.metadata });
  } else if (command === "open") {
    const project = parseProject(await readJSON(required("project")));
    const check = validateData(project);
    if (!check.ok) throw new Error(check.issues.join("；"));
    const base = "http://127.0.0.1:" + (process.env.FIGURE_PORT || 47831);
    let session;
    try {
      session = await (
        await fetch(base + "/api/session", {
          signal: AbortSignal.timeout(2000),
        })
      ).json();
    } catch {
      const server = spawn(process.execPath, ["server/index.mjs"], {
        cwd: ROOT,
        detached: true,
        windowsHide: true,
        stdio: "ignore",
        env: process.env,
      });
      server.unref();
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 500));
        try {
          session = await (
            await fetch(base + "/api/session", {
              signal: AbortSignal.timeout(1000),
            })
          ).json();
          break;
        } catch {}
      }
    }
    if (!isCompatibleApp(session?.app))
      throw new Error("本地绘图服务未就绪；请运行启动器并检查端口。");
    // Publish a new local copy so an agent handoff cannot overwrite manual edits.
    project.id = null;
    project.revision = 0;
    const response = await fetch(base + "/api/projects", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + session.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(project),
    });
    const saved = await response.json();
    if (!response.ok) throw new Error(saved.error);
    const url = base + "/?project=" + saved.id + "#editor";
    if (options.browser !== "false" && process.platform === "win32") {
      const browser = spawn(
        "powershell.exe",
        ["-NoProfile", "-Command", 'Start-Process -FilePath "' + url + '"'],
        { windowsHide: true, stdio: "ignore" },
      );
      await new Promise((resolve, reject) => {
        browser.on("error", reject);
        browser.on("exit", (code) =>
          code === 0 ? resolve() : reject(new Error("请手动打开 " + url)),
        );
      });
    }
    emit({ url, projectId: saved.id, revision: saved.revision });
  } else if (command === "serve") {
    await import("../server/index.mjs");
  } else
    emit({
      commands: [
        "doctor",
        "draw --spec specification.json --out figure.png",
        "catalog",
        "palettes",
        "export-r --project result.figure.json --out figure.R",
        "inspect --input data.csv",
        "example --recipe violin --out example.csv",
        "create --spec specification.json --out project.figure.json",
        "validate --project project.figure.json",
        "transform --project project.figure.json --action action.json --out transformed.figure.json",
        "render --project project.figure.json --format svg --out figure.svg",
        "open --project project.figure.json --browser false",
        "serve",
      ],
      specification: {
        input: "data.csv",
        recipeId: "violin",
        name: "水稻根长",
        context: "每组12株独立植株",
        mapping: { group: "处理", value: "根长" },
        params: { linewidth: 0.5 },
        labels: { title: "不同处理下的根长", y: "根长（毫米）" },
      },
    });
} catch (e) {
  console.error(JSON.stringify({ error: e.message }, null, 2));
  process.exitCode = 1;
}
