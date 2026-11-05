$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'download.ps1')
$appRoot = Split-Path $PSScriptRoot -Parent
$runtimeRoot = Join-Path $appRoot '.runtime'
$rHome = Join-Path $runtimeRoot 'R'
$rscript = Join-Path $rHome 'bin\Rscript.exe'
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
if (!(Test-Path -LiteralPath $rscript)) {
    $installer = Join-Path $runtimeRoot 'R-4.6.2-win.exe'
    Write-Output 'Downloading the isolated R runtime from a CRAN mirror...'
    $downloaded = $false
    foreach ($mirror in @('https://cloud.r-project.org', 'https://cran.rstudio.com', 'https://cran.r-project.org')) {
        foreach ($location in @('/bin/windows/base/', '/bin/windows/base/old/4.6.2/')) {
            try {
                $base = $mirror + $location
                $checksums = (Invoke-WebRequest -UseBasicParsing -Uri ($base + 'md5sum.R-4.6.2.txt') -TimeoutSec 25).Content
                $line = ($checksums -split "\r?\n") | Where-Object { $_ -match '\bR-4\.6\.2-win\.exe\s*$' } | Select-Object -First 1
                if (!$line) { throw 'R installer checksum entry was not found.' }
                $expected = ($line.Trim() -split '\s+')[0]
                Get-OfficialFile -Uri ($base + 'R-4.6.2-win.exe') -Destination $installer
                if ((Get-FileHash -LiteralPath $installer -Algorithm MD5).Hash.ToLowerInvariant() -ne $expected.ToLowerInvariant()) { throw 'R download checksum mismatch.' }
                $downloaded = $true
                break
            } catch { Write-Warning ('Download attempt failed: ' + $base + ' ' + $_.Exception.Message) }
        }
        if ($downloaded) { break }
    }
    if (!$downloaded) { throw 'Could not download and verify R 4.6.2. Check the network and rerun first-install.cmd.' }
    $process = Start-Process -FilePath $installer -WindowStyle Hidden -PassThru -Wait -ArgumentList @(
        '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/CURRENTUSER',
        ('/DIR="' + $rHome + '"'), '/COMPONENTS=main,x64', '/MERGETASKS=!desktopicon,!quicklaunchicon,!recordversion,!associate'
    )
    if ($process.ExitCode -ne 0) { throw "R setup failed: $($process.ExitCode)" }
}
& $rscript --vanilla (Join-Path $PSScriptRoot 'setup-r.R')
if ($LASTEXITCODE -ne 0) { throw 'R package setup failed.' }
