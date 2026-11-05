# Official runtime downloads only; every caller verifies the vendor checksum.
function Get-OfficialFile([string]$Uri, [string]$Destination) {
    $curlCommand = Get-Command curl.exe -ErrorAction SilentlyContinue
    if ($curlCommand) {
        & $curlCommand.Source --fail --location --silent --show-error --retry 2 --connect-timeout 20 --max-time 600 --output $Destination $Uri
        if ($LASTEXITCODE -ne 0) { throw "Runtime download failed ($LASTEXITCODE): $Uri" }
        return
    }
    $previousProgress = $ProgressPreference
    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -UseBasicParsing -Uri $Uri -OutFile $Destination -TimeoutSec 600
    } finally { $ProgressPreference = $previousProgress }
}
