[CmdletBinding()]
param(
    [string]$Url = 'https://claude.ai/new',
    [string]$ProfileDirectory = 'Default',
    [switch]$InstallShortcut,
    [switch]$Quiet
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-EdgeExecutable {
    $candidates = @(
        'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
        'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
    )

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }
    }

    throw 'Microsoft Edge executable was not found.'
}

function Write-Step {
    param([string]$Message)
    if (-not $Quiet) {
        Write-Host "== $Message =="
    }
}

function Install-ClaudeShortcut {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ScriptPath,
        [Parameter(Mandatory = $true)]
        [string]$IconPath
    )

    $desktopPath = [Environment]::GetFolderPath('Desktop')
    $shortcutPath = Join-Path $desktopPath 'Claude Web.lnk'
    $wsh = New-Object -ComObject WScript.Shell
    $shortcut = $wsh.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = (Get-Command powershell.exe).Source
    $shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$ScriptPath`""
    $shortcut.WorkingDirectory = Split-Path -Path $ScriptPath -Parent
    if (Test-Path -LiteralPath $IconPath) {
        $shortcut.IconLocation = $IconPath
    }
    $shortcut.Save()

    return $shortcutPath
}

$edgeExe = Get-EdgeExecutable
$edgeUserDataDir = Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\User Data'
$scriptPath = $PSCommandPath
$claudeIcon = Join-Path $env:LOCALAPPDATA 'AnthropicClaude\app-1.2278.0\claude.exe'

if ($InstallShortcut) {
    Write-Step 'Installing Claude Web desktop shortcut'
    $shortcut = Install-ClaudeShortcut -ScriptPath $scriptPath -IconPath $claudeIcon
    if (-not $Quiet) {
        Write-Host "shortcut: $shortcut"
    }
}

$arguments = @(
    "--profile-directory=$ProfileDirectory",
    "--user-data-dir=$edgeUserDataDir",
    "--app=$Url"
)

Write-Step 'Launching Claude in Edge app mode'
Start-Process -FilePath $edgeExe -ArgumentList $arguments | Out-Null

if (-not $Quiet) {
    Write-Host "edge: $edgeExe"
    Write-Host "url: $Url"
}
