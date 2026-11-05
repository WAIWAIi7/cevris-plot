# Official runtime downloads only; every caller verifies the vendor checksum.
function Get-OfficialFile([string]$Uri, [string]$Destination) {
    $curlCommand = Get-Command curl.exe -ErrorAction SilentlyContinue
    if ($curlCommand) {
        # Retry all nonzero exits, including TLS disconnects that curl --retry
        # does not retry by default. Each attempt replaces any partial download.
        for ($downloadAttempt = 1; $downloadAttempt -le 3; $downloadAttempt++) {
            & $curlCommand.Source --fail --location --silent --show-error --connect-timeout 20 --max-time 600 --output $Destination $Uri
            if ($LASTEXITCODE -eq 0) { return }
            Write-Warning ('Download interrupted; attempt ' + $downloadAttempt + ' of 3 failed.')
            if ($downloadAttempt -lt 3) { Start-Sleep -Seconds 2 }
        }
        Write-Warning 'Retrying with the Windows download client.'
    }
    $previousProgress = $ProgressPreference
    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -UseBasicParsing -Uri $Uri -OutFile $Destination -TimeoutSec 600
    } finally { $ProgressPreference = $previousProgress }
}
