param(
    [switch]$Launch, [string]$NodeArchive, [string]$RInstaller, [string]$ExtractorArchive,
    [string]$Rscript = $env:FIGURE_RSCRIPT, [string]$RLibrary = $env:FIGURE_R_LIBS,
    [switch]$Offline, [switch]$Rebuild, [switch]$VerifyAll,
    [switch]$CreateShortcut, [switch]$KeepDownloads, [string]$LogPath
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
. (Join-Path $PSScriptRoot 'install-common.ps1')
foreach ($name in @('NodeArchive','RInstaller','ExtractorArchive','Rscript','LogPath')) {
    $value = Get-Variable -Name $name -ValueOnly
    if ($value) { Set-Variable -Name $name -Value $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($value) }
}
if ($RLibrary) { $RLibrary = (($RLibrary -split ';' | ForEach-Object { $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($_) }) -join ';') }
$appRoot = Split-Path $PSScriptRoot -Parent
$runtimeRoot = Join-Path $appRoot '.runtime'
$cache = Join-Path $runtimeRoot 'cache'
$staging = Join-Path $runtimeRoot 'staging'
$dataRoot = Join-Path $appRoot '.data'
New-Item -ItemType Directory -Force -Path $runtimeRoot,$cache,$staging,$dataRoot | Out-Null
if (!$LogPath) { $LogPath = Join-Path $dataRoot 'install.log' }
$transcribing = $false
$lock = $null
$oldLocation = Get-Location
$oldTemp = $env:TEMP; $oldTmp = $env:TMP
try {
    Start-Transcript -LiteralPath $LogPath -Append | Out-Null
    $transcribing = $true
    Write-Install ('Installation log: ' + $LogPath)
    try { $lock = [IO.File]::Open((Join-Path $runtimeRoot 'install.lock'), 'OpenOrCreate', 'ReadWrite', 'None') }
    catch { throw 'Another installation is using this directory. Wait for it to finish.' }
    if (![Environment]::Is64BitOperatingSystem) { throw 'Cevris Plot requires Windows x64.' }
    Set-Location -LiteralPath $appRoot
    $tempRoot = Join-Path $runtimeRoot 'tmp'
    New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
    $env:TEMP = $tempRoot; $env:TMP = $tempRoot
    $env:LC_ALL = ''; $env:LANG = ''
    $manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'runtime-manifest.json') -Raw | ConvertFrom-Json
    $configPath = Join-Path $runtimeRoot 'runtime.json'
    $config = if (Test-Path -LiteralPath $configPath) { Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json } else { $null }
    if (!$Rscript -and $config -and $config.rscript) { $Rscript = if ([IO.Path]::IsPathRooted($config.rscript)) { $config.rscript } else { Join-Path $appRoot $config.rscript } }
    if (!$RLibrary -and $config -and $config.rLibrary) { $RLibrary = $config.rLibrary }
    $nodeExe = $null
    $candidate = if ($env:FIGURE_NODE) { $env:FIGURE_NODE } elseif ($config -and $config.node) { $config.node } else { Get-DownloadNode }
    if ($candidate -and ![IO.Path]::IsPathRooted($candidate)) { $candidate = Join-Path $appRoot $candidate }
    $privateNode = Join-Path $runtimeRoot 'node/node.exe'
    if ($candidate -and (!$NodeArchive -or [IO.Path]::GetFullPath($candidate) -eq [IO.Path]::GetFullPath($privateNode))) {
        if (Test-InstallNode $candidate) { $nodeExe = [IO.Path]::GetFullPath($candidate) }
        else { Write-Install 'Existing Node is incomplete or incompatible; selecting a private Node with npm. It remains available for downloading.' }
    }
    # Estimate only missing components. An estimate is guidance, never a blanket 2 GB gate.
    $estimate = 100MB
    if (!$nodeExe) { $estimate += 220MB }
    if (!$Rscript -and !(Test-Path -LiteralPath (Join-Path $runtimeRoot 'R/bin/x64/Rscript.exe'))) { $estimate += 550MB }
    try {
        $drive = New-Object IO.DriveInfo([IO.Path]::GetPathRoot($runtimeRoot))
        Write-Install ('Estimated additional peak space: ' + [Math]::Ceiling($estimate / 1MB) + ' MiB; free: ' + [Math]::Floor($drive.AvailableFreeSpace / 1MB) + ' MiB.')
        if ($drive.AvailableFreeSpace -lt $estimate) { Write-Warning 'Free space is below the estimate. Reuse Node/R or choose another directory; installation will report actual write failures.' }
    } catch { Write-Warning 'Could not estimate free space; continuing with actual file operations.' }
    if (!$nodeExe) {
        $archive = Get-RuntimeArchive $manifest.node $NodeArchive $cache -Offline:$Offline
        $stage = Join-Path $staging ('n-' + [guid]::NewGuid().ToString('N').Substring(0,8))
        New-Item -ItemType Directory -Path $stage | Out-Null
        try {
            Expand-RuntimeZip $archive $stage -NodeBootstrap
            $tree = Join-Path $stage ('node-v' + $manifest.node.version + '-win-x64')
            if ((Invoke-InstallTool (Join-Path $tree 'node.exe') @('--version') 20) -ne 0) { throw 'Node validation failed.' }
            $destination = Join-Path $runtimeRoot 'node'
            if (Test-Path -LiteralPath $destination) {
                $old = Join-Path $runtimeRoot ('node.incomplete-' + [guid]::NewGuid().ToString('N'))
                Move-Item -LiteralPath $destination -Destination $old
                Write-Warning ('Previous Node directory preserved: ' + $old)
            }
            Move-Item -LiteralPath $tree -Destination $destination
            $nodeExe = Join-Path $destination 'node.exe'
        } finally { Remove-OwnedDirectory $stage $staging }
    }
    $script:CevrisNode = $nodeExe
    $env:FIGURE_NODE = $nodeExe
    $env:PATH = (Split-Path $nodeExe -Parent) + ';' + $env:PATH
    $env:FIGURE_R_LIBS = $RLibrary
    $env:CEVRIS_NODE = $nodeExe
    $buildMissing = @('app.js','app.css','index.html') | Where-Object { !(Test-Path -LiteralPath (Join-Path $appRoot ('build/' + $_))) }
    $frontendManifest = Join-Path $PSScriptRoot 'frontend-manifest.json'
    if (!$Rebuild -and $buildMissing.Count -gt 0 -and (Test-Path -LiteralPath $frontendManifest)) {
        $entry = Get-Content -LiteralPath $frontendManifest -Raw | ConvertFrom-Json
        $version = (Get-Content -LiteralPath (Join-Path $appRoot 'package.json') -Raw | ConvertFrom-Json).version
        if ($entry.version -eq $version) {
            $frontStage = Join-Path $staging ('f-' + [guid]::NewGuid().ToString('N').Substring(0,8))
            try {
                $bundle = Get-RuntimeArchive $entry '' $cache -Offline:$Offline
                Expand-RuntimeZip $bundle $frontStage $nodeExe
                if ((Invoke-InstallTool $nodeExe @('-e','require("node:fs").cpSync(process.argv[1],process.argv[2],{recursive:true})',(Join-Path $frontStage 'build'),(Join-Path $appRoot 'build')) 120) -ne 0) { throw 'Cannot place the prebuilt frontend.' }
                Write-Install 'Installed the checksum-pinned release frontend; source checkout needs no build tool.'
            } catch { Write-Warning ('Prebuilt frontend unavailable; trying local build. ' + $_.Exception.Message) }
            finally { Remove-OwnedDirectory $frontStage $staging }
        }
    }
    $prebuilt = @('app.js','app.css','index.html') | Where-Object { !(Test-Path -LiteralPath (Join-Path $appRoot ('build/' + $_))) }
    $needsBuild = $Rebuild -or $prebuilt.Count -gt 0
    $lockHash = (Get-FileHash -LiteralPath (Join-Path $appRoot 'package-lock.json') -Algorithm SHA256).Hash
    $stampPath = Join-Path $runtimeRoot 'dependencies.json'
    $stamp = if (Test-Path -LiteralPath $stampPath) { Get-Content -LiteralPath $stampPath -Raw | ConvertFrom-Json } else { $null }
    $depsOK = (Invoke-InstallTool $nodeExe @((Join-Path $PSScriptRoot 'check-dependencies.mjs')) 30) -eq 0
    if (!$depsOK -or !$stamp -or $stamp.lockHash -ne $lockHash -or ($needsBuild -and !$stamp.development)) {
        $npmCli = Join-Path (Split-Path $nodeExe -Parent) 'node_modules/npm/bin/npm-cli.js'
        if (!(Test-Path -LiteralPath $npmCli)) { throw 'Selected Node lacks npm. Supply -NodeArchive or a complete Node 24 installation.' }
        Write-Install 'Installing locked dependencies with lifecycle scripts disabled.'
        $npmArgs = @($npmCli,'ci','--ignore-scripts','--no-audit','--no-fund','--cache',(Join-Path $cache 'npm'))
        if (!$needsBuild) { $npmArgs += '--omit=dev' }
        if ($Offline) { $npmArgs += '--offline' }
        if ((Invoke-InstallTool $nodeExe $npmArgs 900) -ne 0) { throw 'Dependency installation failed. Existing downloaded runtimes are retained; inspect install.log.' }
        if ((Invoke-InstallTool $nodeExe @((Join-Path $PSScriptRoot 'check-dependencies.mjs')) 30) -ne 0) { throw 'Required runtime dependencies are unavailable.' }
        @{ lockHash=$lockHash; development=[bool]$needsBuild } | ConvertTo-Json | Set-Content -LiteralPath $stampPath -Encoding UTF8
    } else { Write-Install 'Runtime dependencies already match the lockfile; skipping npm ci.' }
    if ($needsBuild) {
        $buildStage = Join-Path $staging ('build-' + [guid]::NewGuid().ToString('N'))
        $env:FIGURE_BUILD_DIR = $buildStage
        try {
            $code = Invoke-InstallTool $nodeExe @((Join-Path $PSScriptRoot 'build.mjs')) 120
            if ($code -ne 0) {
                if ($prebuilt.Count -eq 0) { Write-Warning 'Rebuild failed; keeping the supplied frontend.' }
                else { throw 'Frontend build failed and no complete prebuilt interface is available. Use the release ZIP.' }
            } else {
                New-Item -ItemType Directory -Force -Path (Join-Path $appRoot 'build') | Out-Null
                foreach ($name in @('app.js','app.css','index.html')) { Copy-Item -LiteralPath (Join-Path $buildStage $name) -Destination (Join-Path $appRoot ('build/' + $name)) -Force }
            }
        } finally { $env:FIGURE_BUILD_DIR = ''; Remove-OwnedDirectory $buildStage $staging }
    } else { Write-Install 'Using the release frontend; no esbuild subprocess is required.' }
    & (Join-Path $PSScriptRoot 'setup-r.ps1') -RInstaller $RInstaller -ExtractorArchive $ExtractorArchive -Rscript $Rscript -Offline:$Offline
    $rSelected = $env:FIGURE_RSCRIPT
    $nodeSetting = if ($nodeExe.StartsWith($appRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { $nodeExe.Substring($appRoot.Length + 1) } else { $nodeExe }
    $rSetting = if ($rSelected.StartsWith($appRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { $rSelected.Substring($appRoot.Length + 1) } else { $rSelected }
    @{ node=$nodeSetting; rscript=$rSetting; rLibrary=$RLibrary } | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
    $verify = if ($VerifyAll) { 'verify-r.mjs' } else { 'verify-install.mjs' }
    if ((Invoke-InstallTool $nodeExe @((Join-Path $PSScriptRoot $verify)) 900) -ne 0) { throw 'R rendering verification failed; files retained for repair.' }
    if (!$KeepDownloads) { Remove-OwnedDirectory $cache $runtimeRoot; Remove-OwnedDirectory $tempRoot $runtimeRoot }
    # The first launched service inherits TEMP/TMP; retain a writable directory
    # after deleting installation debris instead of passing a removed path to R.
    New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
    Write-Install 'Cevris Plot installation complete. No registry or Start Menu changes were required.'
    if ($CreateShortcut) {
        try { & (Join-Path $PSScriptRoot 'shortcut.ps1') }
        catch { Write-Warning ('Optional shortcut failed; use start.cmd: ' + $_.Exception.Message) }
    }
    if ($Launch) {
        try { & (Join-Path $PSScriptRoot 'launch.ps1') }
        catch { Write-Warning ('Installed successfully; automatic opening failed. Run start.cmd. ' + $_.Exception.Message) }
    }
} catch {
    Write-Host ('INSTALL FAILED: ' + $_.Exception.Message)
    Write-Host ('Log: ' + $LogPath)
    throw
} finally {
    $env:TEMP = $oldTemp; $env:TMP = $oldTmp
    Set-Location -LiteralPath $oldLocation
    if ($lock) { $lock.Dispose() }
    if ($transcribing) { Stop-Transcript | Out-Null }
}
