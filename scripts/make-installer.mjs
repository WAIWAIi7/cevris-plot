// Produce a self-contained Windows installer with a pinned, verified release ZIP.
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
const download = await fs.readFile(path.join(root, "scripts", "download.ps1"), "utf8");
const script = `@echo off
setlocal
set "CEVRIS_INSTALLER=%~f0"
set "CEVRIS_INSTALL_DIR=%~1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$text=[IO.File]::ReadAllText($env:CEVRIS_INSTALLER); & ([scriptblock]::Create($text.Substring($text.LastIndexOf('# CEVRIS-POWERSHELL'))))"
if errorlevel 1 pause
exit /b
# CEVRIS-POWERSHELL
$ErrorActionPreference = 'Stop'
if (![Environment]::Is64BitOperatingSystem) { throw 'Cevris Plot requires Windows x64.' }
${download}
$destination = if ($env:CEVRIS_INSTALL_DIR) { [IO.Path]::GetFullPath($env:CEVRIS_INSTALL_DIR) } else { Join-Path $env:LOCALAPPDATA 'CevrisPlot/${PRODUCT.version}' }
$application = Join-Path $destination 'cevris-plot'
$installScript = Join-Path $application 'scripts/install.ps1'
$drive = New-Object System.IO.DriveInfo([IO.Path]::GetPathRoot($destination))
if ($drive.AvailableFreeSpace -lt 2GB) { throw 'Please allow 2 GB of free disk space, or download the portable ZIP and extract it to another drive.' }
if (!(Test-Path -LiteralPath $installScript)) {
    Write-Output 'Downloading Cevris Plot ${PRODUCT.version}...'
    $temporaryZip = Join-Path ([IO.Path]::GetTempPath()) ('cevris-' + [guid]::NewGuid().ToString('N') + '.zip')
    Get-OfficialFile -Uri 'https://github.com/${repository}/releases/download/v${PRODUCT.version}/cevris-plot.zip' -Destination $temporaryZip
    if ((Get-FileHash -LiteralPath $temporaryZip -Algorithm SHA256).Hash.ToLowerInvariant() -ne '${checksum}') { throw 'Release checksum mismatch. Installation stopped.' }
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    Expand-Archive -LiteralPath $temporaryZip -DestinationPath $destination -Force
}
& $installScript -Launch
`;
const output = path.join(root, "dist", "install-cevris-plot.cmd");
await fs.writeFile(output, script.replace(/\r?\n/g, "\r\n"), "utf8");
console.log(JSON.stringify({output, repository, version: PRODUCT.version, verifiesArchiveSHA256: checksum}, null, 2));
