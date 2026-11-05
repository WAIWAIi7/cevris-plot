import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await fs.mkdir(path.join(root, "build"), { recursive: true });
await build({
  entryPoints: [path.join(root, "web", "App.tsx")],
  bundle: true,
  outfile: path.join(root, "build", "app.js"),
  minify: true,
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".css": "css" },
  target: ["es2022"],
  charset: "utf8",
  logLevel: "info",
});
let html = await fs.readFile(path.join(root, "web", "index.html"), "utf8");
for (const asset of ["app.js", "app.css"]) {
  const content = await fs.readFile(path.join(root, "build", asset));
  html = html.replace(
    "/" + asset,
    "/" +
      asset +
      "?v=" +
      createHash("sha256").update(content).digest("hex").slice(0, 12),
  );
}
await fs.writeFile(path.join(root, "build", "index.html"), html);
