import fs from "node:fs/promises";
import path from "node:path";
import { zipSync } from "fflate";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { sourceFiles } from "./package-files.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceOnly = process.argv.includes("--source");
const entries = {};
async function collect(relative) {
  const absolute = path.join(ROOT, relative),
    stat = await fs.lstat(absolute);
  if (stat.isSymbolicLink())
    throw new Error("Cannot package a symbolic link: " + relative);
  if (stat.isDirectory()) {
    for (const child of await fs.readdir(absolute))
      await collect(relative + "/" + child);
  } else {
    if (stat.size >= 50 * 1024 * 1024)
      throw new Error("Oversize source file: " + relative);
    if (
      /(^|\/)(\.data|\.runtime|node_modules|verification|dist|\.env[^/]*)(\/|$)/.test(
        relative,
      )
    )
      throw new Error("Private path in package: " + relative);
    const bytes = await fs.readFile(absolute);
    const text = bytes.toString("utf8");
    if (
      /(?:sk-[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(
        text,
      )
    )
      throw new Error("Potential credential in " + relative);
    if (/[A-Z]:[\\/]Users[\\/][^\s/\\]+/i.test(text))
      throw new Error("Personal machine path in " + relative);
    entries["cevris-plot/" + relative.replaceAll("\\", "/")] =
      new Uint8Array(bytes);
  }
}
for (const item of [...sourceFiles, ...(sourceOnly ? [] : ["build"])])
  await collect(item);
await fs.mkdir(path.join(ROOT, "dist"), { recursive: true });
const output = path.join(
  ROOT,
  "dist",
  sourceOnly ? "cevris-plot-source.zip" : "cevris-plot.zip",
);
await fs.writeFile(output, zipSync(entries, { level: 6 }));
console.log(
  JSON.stringify(
    {
      output,
      files: Object.keys(entries).length,
      bytes: (await fs.stat(output)).size,
      includesPrivateData: false,
      requiresFirstInstall: true,
      sourceOnly,
      sha256: createHash("sha256")
        .update(await fs.readFile(output))
        .digest("hex"),
    },
    null,
    2,
  ),
);
