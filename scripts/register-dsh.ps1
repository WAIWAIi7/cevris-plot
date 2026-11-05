param([string]$Directory, [switch]$Replace)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'download.ps1')
$node = Get-DownloadNode
$appRoot = Split-Path $PSScriptRoot -Parent
$configPath = Join-Path $appRoot '.runtime/runtime.json'
if (!$env:FIGURE_NODE -and (Test-Path -LiteralPath $configPath)) {
    $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
    if ($config.node) {
        $configured = if ([IO.Path]::IsPathRooted($config.node)) { $config.node } else { Join-Path $appRoot $config.node }
        if (Test-Path -LiteralPath $configured) { $node = $configured }
    }
}
if (!$node) { throw 'Run first-install.cmd before registering the DeepSeek Harness skill.' }
$arguments = @((Join-Path $PSScriptRoot 'register-skill.mjs'), '--host', 'dsh')
if ($Directory) { $arguments += @('--directory', $Directory) }
if ($Replace) { $arguments += '--replace' }
& $node @arguments
if ($LASTEXITCODE -ne 0) { throw 'DeepSeek Harness skill registration failed; see the error above.' }
