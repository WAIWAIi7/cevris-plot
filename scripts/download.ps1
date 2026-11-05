# Prefer Node/OpenSSL. Windows TLS is used only before Node is available.
function Get-DownloadNode {
    $candidates = @($env:FIGURE_NODE, $script:CevrisNode)
    if ($PSScriptRoot) { $candidates += Join-Path $PSScriptRoot '../.runtime/node/node.exe' }
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) { return (Resolve-Path -LiteralPath $candidate).Path }
    }
    $command = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    return $null
}
function Test-SHA256([string]$Path, [string]$Expected) {
    if (!(Test-Path -LiteralPath $Path)) { return $false }
    if (!$Expected) { return $true }
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash -eq $Expected
}
function Get-OfficialFile([string]$Uri, [string]$Destination, [string]$SHA256 = '') {
    if ($SHA256 -and (Test-SHA256 $Destination $SHA256)) { Write-Host ('Using verified cache: ' + [IO.Path]::GetFileName($Destination)); return }
    $downloadNode = Get-DownloadNode
    $downloader = if ($script:CevrisDownloader) { $script:CevrisDownloader } else { Join-Path $PSScriptRoot 'download.mjs' }
    if ($downloadNode -and (Test-Path -LiteralPath $downloader)) {
        Write-Host ('Downloading with Node/OpenSSL: ' + ([Uri]$Uri).Host)
        & $downloadNode $downloader $Uri $Destination $SHA256
        if ($LASTEXITCODE -ne 0) { throw 'Node download failed. See log; use a verified preloaded archive if the network is unavailable.' }
        return
    }
    $temporary = $Destination + '.' + [guid]::NewGuid().ToString('N') + '.part'
    try {
        $downloaded = $false
        $curlCommand = Get-Command curl.exe -ErrorAction SilentlyContinue
        if ($curlCommand) {
            for ($attempt = 1; $attempt -le 2; $attempt++) {
                & $curlCommand.Source --fail --location --silent --show-error --connect-timeout 15 --max-time 180 --output $temporary $Uri
                if ($LASTEXITCODE -eq 0) { $downloaded = $true; break }
            }
        }
        if (!$downloaded) { Invoke-WebRequest -UseBasicParsing -Uri $Uri -OutFile $temporary -TimeoutSec 180 }
        if (!(Test-SHA256 $temporary $SHA256)) { throw 'Download SHA-256 mismatch.' }
        Move-Item -LiteralPath $temporary -Destination $Destination -Force
    } catch { throw ('Download failed. Set FIGURE_NODE to an existing node.exe or supply -NodeArchive / preloaded files. ' + $_.Exception.Message) }
    finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force } }
}
