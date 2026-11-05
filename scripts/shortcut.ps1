$ErrorActionPreference = 'Stop'
$appRoot = Split-Path $PSScriptRoot -Parent
$programs = [Environment]::GetFolderPath('Programs')
if (!$programs) { throw 'The current user Start Menu could not be located.' }
$shortcutPath = Join-Path $programs 'Cevris Plot.lnk'
$description = 'Open Cevris Plot locally'
$shell = New-Object -ComObject WScript.Shell
try {
    $shortcut = $shell.CreateShortcut($shortcutPath)
    if ((Test-Path -LiteralPath $shortcutPath) -and $shortcut.Description -ne $description) {
        throw 'An unrelated Start Menu shortcut has the same name. It was not changed.'
    }
    $shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $shortcut.Arguments = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + (Join-Path $PSScriptRoot 'launch.ps1') + '"'
    $shortcut.WorkingDirectory = $appRoot
    $shortcut.Description = $description
    $shortcut.WindowStyle = 7
    $shortcut.Save()
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shortcut)
    Write-Output 'Start Menu shortcut created: Cevris Plot'
} finally { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shell) }
