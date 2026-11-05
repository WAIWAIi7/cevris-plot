import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { sourceFiles } from "./package-files.mjs";
import { PRODUCT } from "../shared/identity.mjs";
import { CATALOG } from "../shared/catalog.mjs";
import { NUMBERED_RECIPES } from "../shared/home.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = async (file) => JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
const pkg = await json("package.json"), lock = await json("package-lock.json");
for (const metadata of [pkg, lock, lock.packages[""]]) {
  assert.equal(metadata.name, PRODUCT.slug, "Package name differs from product");
  assert.equal(metadata.version, PRODUCT.version, "Version differs from product");
}
assert.equal(pkg.license, "MIT");
assert.equal(pkg.private, true, "Prevent accidental npm publication");
assert.deepEqual([...NUMBERED_RECIPES].sort(), CATALOG.map(r => r.id).sort());
assert.match(await fs.readFile(path.join(root, "SKILL.md"), "utf8"), /^---\r?\nname: cevris-plot\r?\n/);
let files = 0, bytes = 0;
async function inspect(relative) {
  const full = path.join(root, relative), stat = await fs.lstat(full);
  assert(!stat.isSymbolicLink(), "Symbolic link in public source: " + relative);
  assert(!/(^|\/)(\.data|\.runtime|node_modules|verification|dist|\.env[^/]*)(\/|$)/.test(relative), "Private path: " + relative);
  if (stat.isDirectory()) {
    for (const child of await fs.readdir(full)) await inspect(relative + "/" + child);
    return;
  }
  assert(stat.size < 50 * 1024 * 1024, "File too large: " + relative);
  const text = await fs.readFile(full, "utf8");
  assert(!/(?:sk-[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(text), "Credential pattern: " + relative);
  assert(!/[A-Z]:[\\/]Users[\\/][^\s/\\]+/i.test(text), "Personal path: " + relative);
  if (/\.md$/i.test(relative)) {
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1].split("#")[0];
      if (!target || /^[a-z]+:/i.test(target)) continue;
      const resolved = path.resolve(path.dirname(full), decodeURIComponent(target));
      assert(resolved.startsWith(root + path.sep), "External local link: " + relative + " → " + target);
      await fs.access(resolved).catch(() => { throw new Error("Broken documentation link: " + relative + " → " + target); });
    }
  }
  files++; bytes += stat.size;
}
for (const item of sourceFiles) await inspect(item);
console.log(JSON.stringify({ product: PRODUCT, sourceFiles: files, bytes, templates: CATALOG.length, checks: "metadata, source allowlist, credential patterns, documentation links" }, null, 2));
