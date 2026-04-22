[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$TaskName = 'Windows Update Guard'
$GuardScript = Join-Path $env:ProgramData 'WindowsUpdateGuard\windows-update-guard.ps1'

if (Test-Path -LiteralPath $GuardScript) {
    & PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File $GuardScript -Mode Restore
}

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

Write-Output "Uninstalled $TaskName and restored the pre-install baseline where it was captured."
