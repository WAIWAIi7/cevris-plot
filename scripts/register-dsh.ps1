param([string]$Directory, [switch]$Replace)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'download.ps1')
$node = Get-DownloadNode
if (!$node) { throw 'Run first-install.cmd before registering the DeepSeek Harness skill.' }
$arguments = @((Join-Path $PSScriptRoot 'register-skill.mjs'), '--host', 'dsh')
if ($Directory) { $arguments += @('--directory', $Directory) }
if ($Replace) { $arguments += '--replace' }
& $node @arguments
if ($LASTEXITCODE -ne 0) { throw 'DeepSeek Harness skill registration failed; see the error above.' }
