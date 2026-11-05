param([string]$RInstaller, [string]$ExtractorArchive, [string]$Rscript = $env:FIGURE_RSCRIPT, [switch]$Offline)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'install-common.ps1')
$appRoot = Split-Path $PSScriptRoot -Parent
$runtimeRoot = Join-Path $appRoot '.runtime'
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'runtime-manifest.json') -Raw | ConvertFrom-Json
$cache = Join-Path $runtimeRoot 'cache'
$staging = Join-Path $runtimeRoot 'staging'
New-Item -ItemType Directory -Force -Path $cache,$staging | Out-Null
if (!$Rscript) { $Rscript = Join-Path $runtimeRoot 'R/bin/x64/Rscript.exe' }
$Rscript = Get-DirectR $Rscript
if (!(Test-Path -LiteralPath $Rscript)) {
    if ($env:FIGURE_RSCRIPT -or !$Rscript.StartsWith($runtimeRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'The selected external Rscript does not exist.' }
    $installer = Get-RuntimeArchive $manifest.r $RInstaller $cache -Offline:$Offline
    $extractZip = Get-RuntimeArchive $manifest.extractor $ExtractorArchive $cache -Offline:$Offline
    $stage = Join-Path $staging ('r-' + [guid]::NewGuid().ToString('N').Substring(0,8))
    New-Item -ItemType Directory -Path $stage | Out-Null
    try {
        $toolDir = Join-Path $stage 'extractor'
        Expand-RuntimeZip $extractZip $toolDir (Get-DownloadNode)
        Write-Install 'Extracting R files only. The R installer is never executed.'
        $code = Invoke-InstallTool (Join-Path $toolDir 'innoextract.exe') @('--extract','--silent','--include','app','--output-dir',(Join-Path $stage 'unpacked'),$installer) 180
        if ($code -ne 0) { throw ('R extraction failed: ' + $code + '. No installer fallback will run.') }
        $tree = Join-Path $stage 'unpacked/app'
        $probe = Join-Path $tree 'bin/x64/Rscript.exe'
        $code = Invoke-InstallTool $probe @('--vanilla','-e','stopifnot(getRversion() >= "4.2.0"); cat(R.version.string, "\n")') 30
        if ($code -ne 0) { throw 'Extracted R failed validation.' }
        $rHome = Join-Path $runtimeRoot 'R'
        if (Test-Path -LiteralPath $rHome) {
            $old = Join-Path $runtimeRoot ('R.incomplete-' + [guid]::NewGuid().ToString('N'))
            Move-Item -LiteralPath $rHome -Destination $old
            Write-Warning ('Incomplete previous R directory preserved: ' + $old)
        }
        Move-Item -LiteralPath $tree -Destination $rHome
        $Rscript = Join-Path $rHome 'bin/x64/Rscript.exe'
    } finally { Remove-OwnedDirectory $stage $staging }
}
Write-Install ('Using R: ' + $Rscript)
$env:FIGURE_RSCRIPT = $Rscript
$env:CEVRIS_OFFLINE = if ($Offline) { '1' } else { '0' }
$code = Invoke-InstallTool $Rscript @('--vanilla',(Join-Path $PSScriptRoot 'setup-r.R')) 1200
if ($code -ne 0) { throw ('R package setup failed: ' + $code + '. Existing R files have been retained.') }
