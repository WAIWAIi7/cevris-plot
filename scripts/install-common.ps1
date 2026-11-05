. (Join-Path $PSScriptRoot 'download.ps1')
function Write-Install([string]$Message) { Write-Host ('[' + (Get-Date -Format 'HH:mm:ss') + '] ' + $Message) }
function Remove-OwnedDirectory([string]$Path, [string]$Root) {
    $full = [IO.Path]::GetFullPath($Path).TrimEnd('\','/')
    $parent = [IO.Path]::GetFullPath($Root).TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar
    if (!$full.StartsWith($parent, [StringComparison]::OrdinalIgnoreCase)) { throw 'Refusing cleanup outside owned staging directory.' }
    if (Test-Path -LiteralPath $full) {
        if ((Get-Item -LiteralPath $full).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing recursive cleanup of reparse point.' }
        $cleanupNode = Get-DownloadNode
        if ($cleanupNode) {
            if ((Invoke-InstallTool $cleanupNode @('-e','require("node:fs").rmSync(process.argv[1], {recursive:true,force:true})',$full) 120) -ne 0) { throw 'Owned staging cleanup failed.' }
        } else { Remove-Item -LiteralPath $full -Recurse -Force }
    }
}
function Quote-Argument([string]$Value) {
    # Windows CommandLineToArgvW escaping; no shell interpolation.
    return '"' + [regex]::Replace([regex]::Replace($Value, '(\\*)"', '$1$1\"'), '(\\+)$', '$1$1') + '"'
}
function Invoke-InstallTool([string]$File, [string[]]$Arguments, [int]$TimeoutSeconds = 900) {
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = $File
    $info.Arguments = ($Arguments | ForEach-Object { Quote-Argument $_ }) -join ' '
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.WorkingDirectory = (Get-Location).Path
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $info
    try {
        if (!$process.Start()) { throw ('Cannot start ' + $File) }
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        if (!$process.WaitForExit($TimeoutSeconds * 1000)) {
            # Only our child tree; never terminate another application.
            & taskkill.exe /PID $process.Id /T /F | Out-Null
            throw ('Command timed out after ' + $TimeoutSeconds + ' seconds: ' + [IO.Path]::GetFileName($File))
        }
        $out = $stdout.GetAwaiter().GetResult(); $err = $stderr.GetAwaiter().GetResult()
        if ($out) { Write-Host $out.TrimEnd() }
        if ($err) { Write-Host $err.TrimEnd() }
        return $process.ExitCode
    } finally { $process.Dispose() }
}
function Get-RuntimeArchive($Entry, [string]$Provided, [string]$Cache, [switch]$Offline) {
    if ($Provided) {
        $file = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Provided)
        if (!(Test-SHA256 $file $Entry.sha256)) { throw ('Preloaded archive SHA-256 mismatch: ' + [IO.Path]::GetFileName($file)) }
        return $file
    }
    $file = Join-Path $Cache $Entry.file
    if (Test-SHA256 $file $Entry.sha256) { Write-Install ('Reusing verified ' + $Entry.file); return $file }
    if ($Offline) { throw ('Offline: missing ' + $Entry.file + '. Supply the matching preloaded archive.') }
    foreach ($url in $Entry.urls) {
        try { Get-OfficialFile -Uri $url -Destination $file -SHA256 $Entry.sha256; return $file }
        catch { Write-Warning $_.Exception.Message }
    }
    throw ('Unable to download verified ' + $Entry.file + '; preloaded files are supported. See installation log.')
}
function Test-InstallNode([string]$Path) {
    if (!$Path -or !(Test-Path -LiteralPath $Path)) { return $false }
    $npm = Join-Path (Split-Path $Path -Parent) 'node_modules/npm/bin/npm-cli.js'
    if (!(Test-Path -LiteralPath $npm)) { return $false }
    try { return (Invoke-InstallTool $Path @('-e', 'process.exit(process.versions.node.split(".")[0] === "24" ? 0 : 1)') 20) -eq 0 }
    catch { return $false }
}
function Get-DirectR([string]$Path) {
    $full = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Path)
    $direct = Join-Path (Split-Path $full -Parent) 'x64/Rscript.exe'
    if (Test-Path -LiteralPath $direct) { return $direct }
    return $full
}
function Expand-RuntimeZip([string]$Archive, [string]$Destination, [string]$Node, [switch]$NodeBootstrap) {
    if ($NodeBootstrap) {
        # Extract only the self-contained node.exe via .NET, then let Node unpack
        # npm's deep directory tree. No global LongPathsEnabled registry change.
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = [IO.Compression.ZipFile]::OpenRead($Archive)
        $bootstrapNode = Join-Path (Split-Path $Destination -Parent) ('node-bootstrap-' + [guid]::NewGuid().ToString('N').Substring(0,8) + '.exe')
        try {
            $entry = $zip.Entries | Where-Object FullName -Match '^node-v[^/]+/node.exe$' | Select-Object -First 1
            if (!$entry) { throw 'Node executable missing from verified archive.' }
            $inputStream = $entry.Open(); $outputStream = [IO.File]::Create($bootstrapNode)
            try { $inputStream.CopyTo($outputStream) } finally { $inputStream.Dispose(); $outputStream.Dispose() }
        } finally { $zip.Dispose() }
        $Node = $bootstrapNode
    }
    try {
        if ((Invoke-InstallTool $Node @((Join-Path $PSScriptRoot 'extract-zip.mjs'),$Archive,$Destination) 180) -ne 0) { throw 'ZIP extraction failed.' }
    } finally { if ($bootstrapNode -and (Test-Path -LiteralPath $bootstrapNode)) { Remove-Item -LiteralPath $bootstrapNode -Force } }
}
