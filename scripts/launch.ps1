param([switch]$SkipBrowser)
$ErrorActionPreference = 'Stop'
$appRoot = Split-Path $PSScriptRoot -Parent
$dataRoot = Join-Path $appRoot '.data'
$baseUrl = 'http://127.0.0.1:47831'
New-Item -ItemType Directory -Path $dataRoot -Force | Out-Null
$launchLog = Join-Path $dataRoot 'launcher.log'
function Write-LaunchLog([string]$message) {
    Add-Content -LiteralPath $launchLog -Value ((Get-Date -Format o) + ' ' + $message) -Encoding UTF8
}
function Test-FigureServer {
    try { return ((Invoke-RestMethod -Uri ($baseUrl + '/api/session') -TimeoutSec 2).app -in @('cevris-plot', 'figure-studio')) } catch { return $false }
}
function Test-FigurePort {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $pending = $client.ConnectAsync('127.0.0.1', 47831)
        return ($pending.Wait(700) -and $client.Connected)
    } catch { return $false } finally { $client.Dispose() }
}
# Serialize double-clicks and the login launcher. Never terminate another port owner.
$mutex = New-Object System.Threading.Mutex($false, 'Local\FigureStudio-47831-Launcher')
$locked = $false
try {
    try { $locked = $mutex.WaitOne(45000) } catch [System.Threading.AbandonedMutexException] { $locked = $true }
    if (!$locked) { throw 'Another Cevris Plot launcher is still starting. Please retry shortly.' }
    Write-LaunchLog ('Launch requested. Background=' + $SkipBrowser.IsPresent)
if (!(Test-FigureServer)) {
    if (Test-FigurePort) { throw 'Port 47831 is occupied by a different or unresponsive application. No process was stopped.' }
    $nodeExe = Join-Path $appRoot '.runtime\node\node.exe'
    if (!(Test-Path -LiteralPath $nodeExe)) {
        $command = Get-Command node -ErrorAction SilentlyContinue
        if ($command) { $nodeExe = $command.Source } else { throw 'Run first-install.cmd once before starting the app.' }
    }
    if (!(Test-Path -LiteralPath (Join-Path $appRoot 'build\app.js'))) { throw 'Run first-install.cmd to build the application.' }
    $previousPort = [Environment]::GetEnvironmentVariable('FIGURE_PORT', 'Process')
    try {
        $env:FIGURE_PORT = '47831'
        $process = Start-Process -FilePath $nodeExe -ArgumentList @('server/index.mjs') -WorkingDirectory $appRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $dataRoot 'server.log') -RedirectStandardError (Join-Path $dataRoot 'server-error.log')
    } finally { [Environment]::SetEnvironmentVariable('FIGURE_PORT', $previousPort, 'Process') }
    $process.Id | Set-Content -LiteralPath (Join-Path $dataRoot 'server.pid')
    Write-LaunchLog ('Started local server PID ' + $process.Id)
    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    $ready = $false
    while ($timer.Elapsed.TotalSeconds -lt 60) {
        if (Test-FigureServer) { $ready = $true; break }
        $process.Refresh()
        if ($process.HasExited) { throw ('Startup failed. See ' + (Join-Path $dataRoot 'server-error.log')) }
        Start-Sleep -Milliseconds 500
    }
    if (!$ready) { throw ('The local server did not start within 60 seconds. Read ' + (Join-Path $dataRoot 'server-error.log')) }
    Write-LaunchLog ('Local service is ready after ' + [Math]::Round($timer.Elapsed.TotalSeconds, 1) + ' seconds.')
} else { Write-LaunchLog 'Existing local service is ready; no duplicate process started.' }
if (!$SkipBrowser) { Start-Process $baseUrl }
Write-Output $baseUrl
} catch {
    Write-LaunchLog ('ERROR: ' + $_.Exception.Message)
    Write-Error $_
    exit 1
} finally {
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
