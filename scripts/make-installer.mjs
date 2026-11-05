// Build two equivalent offline-capable bootstrap entrypoints.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { PRODUCT } from "../shared/identity.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repository = process.argv[2];
if (!/^[A-Za-z0-9-]+\/cevris-plot$/.test(repository || ""))
  throw new Error("Usage: node scripts/make-installer.mjs OWNER/cevris-plot");
const archive = await fs.readFile(path.join(root, "dist", "cevris-plot.zip"));
const checksum = createHash("sha256").update(archive).digest("hex");
const manifest = JSON.parse(await fs.readFile(path.join(root, "scripts/runtime-manifest.json"), "utf8"));
const downloader = await fs.readFile(path.join(root, "scripts/download.mjs"));
const extractor = await fs.readFile(path.join(root, "scripts/extract-zip.mjs"));
const functions = await fs.readFile(path.join(root, "scripts/download.ps1"), "utf8");
const constants = [
  "$releaseVersion = '" + PRODUCT.version + "'",
  "$archiveURL = 'https://github.com/" + repository + "/releases/download/v" + PRODUCT.version + "/cevris-plot.zip'",
  "$archiveSHA256 = '" + checksum + "'",
  "$nodeSHA256 = '" + manifest.node.sha256 + "'",
  "$nodeVersion = '" + manifest.node.version + "'",
  "$nodeURL = '" + manifest.node.urls[0] + "'",
  "$downloadSource = '" + downloader.toString("base64") + "'",
  "$extractSource = '" + extractor.toString("base64") + "'",
].join("\n");
const body = (await fs.readFile(path.join(root, "scripts/bootstrap.ps1"), "utf8"))
  .replace("# RELEASE_CONSTANTS", () => constants).replace("# DOWNLOAD_FUNCTIONS", () => functions);
await fs.writeFile(path.join(root, "dist/install-cevris-plot.ps1"), "\uFEFF" + body.replace(/\r?\n/g, "\r\n"));
const cmd = [
  "@echo off", "setlocal", 'set "PSModulePath="',
  'set "CEVRIS_INSTALLER=%~f0"', 'set "CEVRIS_INSTALL_DIR=%~1"',
  'if not "%CEVRIS_INSTALL_DIR%"=="" goto run',
  'if "%CEVRIS_UNATTENDED%"=="1" goto run',
  'echo Cevris Plot - choose any writable installation folder.',
  'set /p "CEVRIS_INSTALL_DIR=Folder (Enter for the default user folder): "',
  ':run',
  'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$text=[IO.File]::ReadAllText($env:CEVRIS_INSTALLER); & ([scriptblock]::Create($text.Substring($text.LastIndexOf(\'# CEVRIS-POWERSHELL\')))) -InstallDir $env:CEVRIS_INSTALL_DIR -NoLaunch:($env:CEVRIS_NO_LAUNCH -eq \'1\')"',
  'set "CEVRIS_EXIT_CODE=%ERRORLEVEL%"',
  'if not "%CEVRIS_EXIT_CODE%"=="0" if "%CEVRIS_PAUSE_ON_ERROR%"=="1" pause',
  "exit /b %CEVRIS_EXIT_CODE%", "# CEVRIS-POWERSHELL", body,
].join("\r\n");
await fs.writeFile(path.join(root, "dist/install-cevris-plot.cmd"), cmd);
console.log(JSON.stringify({ version: PRODUCT.version, checksum, installers: ["install-cevris-plot.cmd", "install-cevris-plot.ps1"] }));
