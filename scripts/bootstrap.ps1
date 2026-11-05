param(
    [string]$InstallDir, [string]$ArchivePath, [string]$NodeArchive,
    [string]$RInstaller, [string]$ExtractorArchive, [string]$Rscript, [string]$RLibrary,
    [switch]$Offline, [switch]$NoLaunch, [switch]$CreateShortcut
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
# RELEASE_CONSTANTS
# DOWNLOAD_FUNCTIONS
foreach ($name in @('InstallDir','ArchivePath','NodeArchive','RInstaller','ExtractorArchive','Rscript')) {
    $value = Get-Variable -Name $name -ValueOnly
    if ($value) { Set-Variable -Name $name -Value $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($value) }
}
if (!$InstallDir) { $InstallDir = Join-Path $env:LOCALAPPDATA ('CevrisPlot/' + $releaseVersion) }
$InstallDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($InstallDir)
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
$log = Join-Path $InstallDir 'bootstrap.log'
$stage = Join-Path $InstallDir ('.bootstrap-' + [guid]::NewGuid().ToString('N'))
$transcribing = $false
try {
    Start-Transcript -LiteralPath $log -Append | Out-Null
    $transcribing = $true
    Write-Host ('Installing into: ' + $InstallDir)
    New-Item -ItemType Directory -Path $stage | Out-Null
    $script:CevrisDownloader = Join-Path $stage 'download.mjs'
    [IO.File]::WriteAllBytes($script:CevrisDownloader, [Convert]::FromBase64String($downloadSource))
    $extractScript = Join-Path $stage 'extract-zip.mjs'
    [IO.File]::WriteAllBytes($extractScript, [Convert]::FromBase64String($extractSource))
    $application = Join-Path $InstallDir 'cevris-plot'
    $privateNode = Join-Path $application '.runtime/node/node.exe'
    if (Test-Path -LiteralPath $privateNode) { $script:CevrisNode = $privateNode }
    if (!(Get-DownloadNode)) {
        if (!$NodeArchive) {
            if ($Offline) { throw 'Offline bootstrap needs FIGURE_NODE or -NodeArchive.' }
            $NodeArchive = Join-Path $stage 'node.zip'
            Get-OfficialFile -Uri $nodeURL -Destination $NodeArchive -SHA256 $nodeSHA256
        }
        if (!(Test-SHA256 $NodeArchive $nodeSHA256)) { throw 'Preloaded Node archive checksum mismatch.' }
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = [IO.Compression.ZipFile]::OpenRead($NodeArchive)
        $script:CevrisNode = Join-Path $stage 'node.exe'
        try {
            $entry = $zip.GetEntry('node-v' + $nodeVersion + '-win-x64/node.exe')
            if (!$entry) { throw 'Node executable missing from archive.' }
            $inputStream = $entry.Open(); $outputStream = [IO.File]::Create($script:CevrisNode)
            try { $inputStream.CopyTo($outputStream) } finally { $inputStream.Dispose(); $outputStream.Dispose() }
        } finally { $zip.Dispose() }
        $env:FIGURE_NODE = $script:CevrisNode
    }
    $installScript = Join-Path $application 'scripts/install.ps1'
    if (Test-Path -LiteralPath $installScript) {
        $installedVersion = (Get-Content -LiteralPath (Join-Path $application 'package.json') -Raw | ConvertFrom-Json).version
        if ($installedVersion -ne $releaseVersion) { throw 'A different version already exists here. Select a new folder; your old projects have been preserved.' }
    } else {
        if (!$ArchivePath) {
            if ($Offline) { throw 'Offline bootstrap needs -ArchivePath pointing to the downloaded release ZIP.' }
            $ArchivePath = Join-Path $stage 'cevris-plot.zip'
            Get-OfficialFile -Uri $archiveURL -Destination $ArchivePath -SHA256 $archiveSHA256
        }
        if (!(Test-SHA256 $ArchivePath $archiveSHA256)) { throw 'Release ZIP checksum mismatch.' }
        & (Get-DownloadNode) $extractScript $ArchivePath (Join-Path $stage 'release')
        if ($LASTEXITCODE -ne 0) { throw 'Release ZIP extraction failed.' }
        if (Test-Path -LiteralPath $application) { throw 'An incomplete folder already exists. Preserve it and select a new folder, or run its scripts/install.ps1.' }
        Move-Item -LiteralPath (Join-Path $stage 'release/cevris-plot') -Destination $application
    }
    # Stop the bootstrap transcript before the application opens its own log.
    Stop-Transcript | Out-Null; $transcribing = $false
    & $installScript -Launch:(!$NoLaunch) -NodeArchive $NodeArchive -RInstaller $RInstaller -ExtractorArchive $ExtractorArchive -Rscript $Rscript -RLibrary $RLibrary -Offline:$Offline -CreateShortcut:$CreateShortcut
} catch {
    Write-Host ('INSTALL FAILED: ' + $_.Exception.Message)
    Write-Host ('Logs: ' + $log + ' and cevris-plot/.data/install.log')
    throw
} finally {
    if ($transcribing) { Stop-Transcript | Out-Null }
    $resolved = [IO.Path]::GetFullPath($stage)
    $boundary = $InstallDir.TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar
    if ($resolved.StartsWith($boundary, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolved)) {
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}
