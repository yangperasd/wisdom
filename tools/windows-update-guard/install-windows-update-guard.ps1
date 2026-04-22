[CmdletBinding()]
param(
    [int]$RepeatMinutes = 15
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($RepeatMinutes -lt 5) {
    throw 'RepeatMinutes must be at least 5.'
}

$SourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceScript = Join-Path $SourceRoot 'windows-update-guard.ps1'
$TargetRoot = Join-Path $env:ProgramData 'WindowsUpdateGuard'
$TargetScript = Join-Path $TargetRoot 'windows-update-guard.ps1'
$BaselinePath = Join-Path $TargetRoot 'baseline.json'
$TaskName = 'Windows Update Guard'
$TaskDescription = 'Reapplies strict manual-only Windows Update settings and disables update orchestration.'

if (-not (Test-Path -LiteralPath $SourceScript)) {
    throw "Missing source script: $SourceScript"
}

if (-not (Test-Path -LiteralPath $TargetRoot)) {
    New-Item -Path $TargetRoot -ItemType Directory -Force | Out-Null
}

Copy-Item -Path $SourceScript -Destination $TargetScript -Force

$taskTargets = @(
    @{ TaskPath = '\Microsoft\Windows\UpdateOrchestrator\'; TaskName = 'Schedule Maintenance Work' }
    @{ TaskPath = '\Microsoft\Windows\UpdateOrchestrator\'; TaskName = 'Schedule Scan' }
    @{ TaskPath = '\Microsoft\Windows\UpdateOrchestrator\'; TaskName = 'Schedule Scan Static Task' }
    @{ TaskPath = '\Microsoft\Windows\UpdateOrchestrator\'; TaskName = 'Schedule Wake To Work' }
    @{ TaskPath = '\Microsoft\Windows\UpdateOrchestrator\'; TaskName = 'Schedule Work' }
    @{ TaskPath = '\Microsoft\Windows\UpdateOrchestrator\'; TaskName = 'Start Oobe Expedite Work' }
    @{ TaskPath = '\Microsoft\Windows\UpdateOrchestrator\'; TaskName = 'StartOobeAppsScanAfterUpdate' }
    @{ TaskPath = '\Microsoft\Windows\UpdateOrchestrator\'; TaskName = 'StartOobeAppsScan_LicenseAccepted' }
    @{ TaskPath = '\Microsoft\Windows\UpdateOrchestrator\'; TaskName = 'UIEOrchestrator' }
    @{ TaskPath = '\Microsoft\Windows\UpdateOrchestrator\'; TaskName = 'USO_UxBroker' }
    @{ TaskPath = '\Microsoft\Windows\UpdateOrchestrator\'; TaskName = 'UUS Failover Task' }
    @{ TaskPath = '\Microsoft\Windows\WaaSMedic\'; TaskName = 'DeferredWork' }
    @{ TaskPath = '\Microsoft\Windows\WaaSMedic\'; TaskName = 'MaintenanceWork' }
    @{ TaskPath = '\Microsoft\Windows\WaaSMedic\'; TaskName = 'PerformRemediation' }
    @{ TaskPath = '\Microsoft\Windows\WindowsUpdate\'; TaskName = 'Scheduled Start' }
)

function Get-OptionalValue {
    param(
        [string]$Path,
        [string]$Name
    )

    try {
        return (Get-ItemProperty -Path $Path -Name $Name -ErrorAction Stop).$Name
    } catch {
        return $null
    }
}

if (-not (Test-Path -LiteralPath $BaselinePath)) {
    $baseline = [ordered]@{
        CapturedAt = (Get-Date).ToString('o')
        Policies = [ordered]@{
            WindowsUpdateAU = [ordered]@{
                NoAutoUpdate = Get-OptionalValue -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -Name 'NoAutoUpdate'
                AUOptions = Get-OptionalValue -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -Name 'AUOptions'
                NoAutoRebootWithLoggedOnUsers = Get-OptionalValue -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -Name 'NoAutoRebootWithLoggedOnUsers'
            }
            WindowsStore = [ordered]@{
                AutoDownload = Get-OptionalValue -Path 'HKLM:\SOFTWARE\Policies\Microsoft\WindowsStore' -Name 'AutoDownload'
            }
        }
        Services = @(
            @{ Name = 'wuauserv'; Start = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\wuauserv').Start }
            @{ Name = 'UsoSvc'; Start = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\UsoSvc').Start }
            @{ Name = 'WaaSMedicSvc'; Start = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\WaaSMedicSvc').Start }
        )
        Tasks = @()
    }

    foreach ($task in $taskTargets) {
        try {
            $scheduledTask = Get-ScheduledTask -TaskPath $task.TaskPath -TaskName $task.TaskName -ErrorAction Stop
            $baseline.Tasks += @{
                TaskPath = $task.TaskPath
                TaskName = $task.TaskName
                Enabled = [bool]$scheduledTask.Settings.Enabled
            }
        } catch {
        }
    }

    $baseline | ConvertTo-Json -Depth 6 | Set-Content -Path $BaselinePath
}

$action = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$TargetScript`" -Mode Enforce -CleanupDownloads"
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn
$repeatTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $RepeatMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger @($startupTrigger, $logonTrigger, $repeatTrigger) -Principal $principal -Settings $settings -Description $TaskDescription -Force | Out-Null

try {
    Start-ScheduledTask -TaskName $TaskName
} catch {
    & schtasks.exe /Run /TN $TaskName | Out-Null
}

Start-Sleep -Seconds 5

Write-Output "Installed $TaskName. Deployed script: $TargetScript"
