param([switch]$Launch)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'download.ps1')
if (![Environment]::Is64BitOperatingSystem) { throw 'Cevris Plot requires Windows x64.' }
$appRoot = Split-Path $PSScriptRoot -Parent
$runtimeRoot = Join-Path $appRoot '.runtime'
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
Set-Location -LiteralPath $appRoot
$nodeExe = Join-Path $runtimeRoot 'node\node.exe'
$npmCli = Join-Path $runtimeRoot 'node\node_modules\npm\bin\npm-cli.js'
if (!(Test-Path -LiteralPath $nodeExe) -or !(Test-Path -LiteralPath $npmCli)) {
    Write-Output 'Downloading a private Node.js 24 runtime from nodejs.org...'
    $releases = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -TimeoutSec 30
    $release = $releases | Where-Object { $_.version -match '^v24\.' -and $_.files -contains 'win-x64-zip' } | Select-Object -First 1
    if (!$release) { throw 'Could not find an official Windows x64 runtime.' }
    $fileName = 'node-' + $release.version + '-win-x64.zip'
    $url = 'https://nodejs.org/dist/' + $release.version + '/'
    $archive = Join-Path $runtimeRoot $fileName
    Get-OfficialFile -Uri ($url + $fileName) -Destination $archive
    $checksums = (Invoke-WebRequest -UseBasicParsing -Uri ($url + 'SHASUMS256.txt') -TimeoutSec 30).Content
    $line = ($checksums -split "\r?\n") | Where-Object { $_.EndsWith($fileName) }
    if (!$line -or (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne ($line -split '\s+')[0]) { throw 'Node.js checksum mismatch.' }
    Expand-Archive -LiteralPath $archive -DestinationPath $runtimeRoot -Force
    $extracted = Join-Path $runtimeRoot ('node-' + $release.version + '-win-x64')
    New-Item -ItemType Directory -Force -Path (Join-Path $runtimeRoot 'node') | Out-Null
    Get-ChildItem -LiteralPath $extracted | Copy-Item -Destination (Join-Path $runtimeRoot 'node') -Recurse -Force
}
$env:PATH = (Split-Path $nodeExe -Parent) + ';' + $env:PATH
& $nodeExe $npmCli ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'JavaScript dependency installation failed.' }
& (Join-Path $PSScriptRoot 'setup-r.ps1')
& $nodeExe (Join-Path $PSScriptRoot 'build.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Interface build failed.' }
& $nodeExe (Join-Path $PSScriptRoot 'verify-r.mjs')
if ($LASTEXITCODE -ne 0) { throw 'R verification failed.' }
Write-Output 'Cevris Plot installation complete.'
if ($Launch) {
    & (Join-Path $PSScriptRoot 'shortcut.ps1')
    & (Join-Path $PSScriptRoot 'launch.ps1')
}
else { Write-Output 'Double-click start.cmd to open the editor.' }
