[CmdletBinding()]
param(
    [int]$Hours = 6
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$GuardScript = Join-Path $env:ProgramData 'WindowsUpdateGuard\windows-update-guard.ps1'

if (-not (Test-Path -LiteralPath $GuardScript)) {
    throw "Guard script is not installed: $GuardScript"
}

& PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File $GuardScript -Mode AllowManual -ManualWindowHours $Hours

Write-Output "Manual update window opened for $Hours hour(s). Windows Update settings should now be available."
