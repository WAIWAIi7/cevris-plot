param([ValidateSet('Enable', 'Disable', 'Status')][string]$Action = 'Status')
$ErrorActionPreference = 'Stop'
$appRoot = Split-Path $PSScriptRoot -Parent
$launchScript = Join-Path $PSScriptRoot 'launch.ps1'
$startupRoot = [Environment]::GetFolderPath('Startup')
if (!$startupRoot) { throw 'The current user Startup folder could not be located.' }
$shortcutPath = Join-Path $startupRoot 'Cevris Plot.lnk'
$legacyPath = Join-Path $startupRoot 'Figure Studio.lnk'
$description = 'Cevris Plot local server (127.0.0.1 only)'
$shell = New-Object -ComObject WScript.Shell
try {
    foreach ($candidate in @($shortcutPath, $legacyPath)) {
        if (Test-Path -LiteralPath $candidate) {
            $existing = $shell.CreateShortcut($candidate)
            $owned = $existing.Description -in @($description, 'Figure Studio local server (127.0.0.1 only)')
            [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($existing)
            if (!$owned) { throw 'An unrelated shortcut has the same name. It has not been changed.' }
        }
    }
    if ($Action -eq 'Enable') {
        if (!(Test-Path -LiteralPath $launchScript)) { throw 'The Cevris Plot launcher is missing.' }
        New-Item -ItemType Directory -Path $startupRoot -Force | Out-Null
        $shortcut = $shell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
        $shortcut.Arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $launchScript + '" -SkipBrowser'
        $shortcut.WorkingDirectory = $appRoot
        $shortcut.Description = $description
        $shortcut.WindowStyle = 7
        $shortcut.Save()
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shortcut)
        if (Test-Path -LiteralPath $legacyPath) { Remove-Item -LiteralPath $legacyPath }
    } elseif ($Action -eq 'Disable') {
        # Remove only verified application shortcuts; keep live servers and projects.
        foreach ($candidate in @($shortcutPath, $legacyPath)) {
            if (Test-Path -LiteralPath $candidate) { Remove-Item -LiteralPath $candidate }
        }
    }
    [pscustomobject]@{
        enabled = ((Test-Path -LiteralPath $shortcutPath) -or (Test-Path -LiteralPath $legacyPath))
        scope = 'current-user-login'
        browserOpensAutomatically = $false
        shortcut = $shortcutPath
        launcher = $launchScript
    } | ConvertTo-Json
} finally { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shell) }
