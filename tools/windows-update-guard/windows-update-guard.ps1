[CmdletBinding()]
param(
    [ValidateSet('Enforce', 'AllowManual', 'Restore')]
    [string]$Mode = 'Enforce',
    [int]$ManualWindowHours = 6,
    [switch]$CleanupDownloads
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$GuardRoot = Join-Path $env:ProgramData 'WindowsUpdateGuard'
$LogPath = Join-Path $GuardRoot 'guard.log'
$PausePath = Join-Path $GuardRoot 'pause-until.txt'
$BaselinePath = Join-Path $GuardRoot 'baseline.json'

$TaskTargets = @(
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

$DefaultServiceStarts = @{
    'wuauserv'     = 3
    'UsoSvc'       = 2
    'WaaSMedicSvc' = 3
}

function Ensure-GuardRoot {
    if (-not (Test-Path -LiteralPath $GuardRoot)) {
        New-Item -Path $GuardRoot -ItemType Directory -Force | Out-Null
    }
}

function Write-Log {
    param([string]$Message)

    Ensure-GuardRoot
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $LogPath -Value "[$timestamp] $Message"
}

function Set-DwordValue {
    param(
        [string]$Path,
        [string]$Name,
        [int]$Value
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -Path $Path -Force | Out-Null
    }

    New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType DWord -Force | Out-Null
}

function Restore-DwordValue {
    param(
        [string]$Path,
        [string]$Name,
        $Value
    )

    if ($null -eq $Value) {
        if (Test-Path -LiteralPath $Path) {
            Remove-ItemProperty -Path $Path -Name $Name -ErrorAction SilentlyContinue
        }
        return
    }

    Set-DwordValue -Path $Path -Name $Name -Value ([int]$Value)
}

function Set-ServiceStartValue {
    param(
        [string]$Name,
        [int]$StartValue
    )

    $serviceKey = "HKLM:\SYSTEM\CurrentControlSet\Services\$Name"
    if (-not (Test-Path -LiteralPath $serviceKey)) {
        Write-Log "Skipped missing service $Name"
        return
    }

    New-ItemProperty -Path $serviceKey -Name 'Start' -Value $StartValue -PropertyType DWord -Force | Out-Null

    $scMode = switch ($StartValue) {
        2 { 'auto' }
        3 { 'demand' }
        4 { 'disabled' }
        default { $null }
    }

    if ($scMode) {
        try {
            & sc.exe config $Name start= $scMode | Out-Null
        } catch {
            Write-Log "sc.exe config failed for ${Name}: $($_.Exception.Message)"
        }
    }
}

function Stop-ServiceSafe {
    param([string]$Name)

    try {
        $service = Get-Service -Name $Name -ErrorAction Stop
        if ($service.Status -ne 'Stopped') {
            Stop-Service -Name $Name -Force -ErrorAction Stop
            Write-Log "Stopped service $Name"
        }
    } catch {
        Write-Log "Stop service skipped for ${Name}: $($_.Exception.Message)"
    }
}

function Start-ServiceSafe {
    param([string]$Name)

    try {
        $service = Get-Service -Name $Name -ErrorAction Stop
        if ($service.Status -eq 'Stopped') {
            Start-Service -Name $Name -ErrorAction Stop
            Write-Log "Started service $Name"
        }
    } catch {
        Write-Log "Start service skipped for ${Name}: $($_.Exception.Message)"
    }
}

function Set-TaskEnabledState {
    param(
        [string]$TaskPath,
        [string]$TaskName,
        [bool]$Enabled
    )

    try {
        if ($Enabled) {
            Enable-ScheduledTask -TaskPath $TaskPath -TaskName $TaskName -ErrorAction Stop | Out-Null
            Write-Log "Enabled task $TaskPath$TaskName"
        } else {
            Disable-ScheduledTask -TaskPath $TaskPath -TaskName $TaskName -ErrorAction Stop | Out-Null
            Write-Log "Disabled task $TaskPath$TaskName"
        }
    } catch {
        $fullName = "$TaskPath$TaskName"
        try {
            if ($Enabled) {
                & schtasks.exe /Change /TN $fullName /ENABLE 2>$null | Out-Null
                Write-Log "Enabled task via schtasks $fullName"
            } else {
                & schtasks.exe /Change /TN $fullName /DISABLE 2>$null | Out-Null
                Write-Log "Disabled task via schtasks $fullName"
            }
        } catch {
            Write-Log "Task change skipped for ${fullName}: $($_.Exception.Message)"
        }
    }
}

function Load-Baseline {
    if (-not (Test-Path -LiteralPath $BaselinePath)) {
        return $null
    }

    return Get-Content -Path $BaselinePath -Raw | ConvertFrom-Json
}

function Get-PauseUntil {
    if (-not (Test-Path -LiteralPath $PausePath)) {
        return $null
    }

    $raw = (Get-Content -Path $PausePath -Raw).Trim()
    $pauseUntil = $null
    if ([datetime]::TryParse($raw, [ref]$pauseUntil)) {
        if ($pauseUntil -gt (Get-Date)) {
            return $pauseUntil
        }
    }

    Remove-Item -LiteralPath $PausePath -Force -ErrorAction SilentlyContinue
    return $null
}

function Set-PauseWindow {
    param([datetime]$PauseUntil)

    Ensure-GuardRoot
    Set-Content -Path $PausePath -Value $PauseUntil.ToString('o')
    Write-Log "Paused enforcement until $($PauseUntil.ToString('o'))"
}

function Clear-PauseWindow {
    Remove-Item -LiteralPath $PausePath -Force -ErrorAction SilentlyContinue
}

function Get-BaselineTaskEnabled {
    param(
        $Baseline,
        [string]$TaskPath,
        [string]$TaskName
    )

    if ($null -eq $Baseline -or $null -eq $Baseline.Tasks) {
        return $true
    }

    $match = $Baseline.Tasks | Where-Object { $_.TaskPath -eq $TaskPath -and $_.TaskName -eq $TaskName } | Select-Object -First 1
    if ($null -eq $match) {
        return $true
    }

    return [bool]$match.Enabled
}

function Get-BaselineServiceStart {
    param(
        $Baseline,
        [string]$ServiceName
    )

    if ($null -ne $Baseline -and $null -ne $Baseline.Services) {
        $match = $Baseline.Services | Where-Object { $_.Name -eq $ServiceName } | Select-Object -First 1
        if ($null -ne $match) {
            return [int]$match.Start
        }
    }

    return [int]$DefaultServiceStarts[$ServiceName]
}

function Stop-UpdateProcesses {
    foreach ($name in @('MoUsoCoreWorker', 'UsoClient')) {
        Get-Process -Name $name -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                Stop-Process -Id $_.Id -Force -ErrorAction Stop
                Write-Log "Stopped process $name (PID $($_.Id))"
            } catch {
                Write-Log "Stop process skipped for ${name}: $($_.Exception.Message)"
            }
        }
    }
}

function Clear-DownloadCache {
    $downloadDir = Join-Path $env:SystemRoot 'SoftwareDistribution\Download'
    if (-not (Test-Path -LiteralPath $downloadDir)) {
        return
    }

    try {
        Remove-Item -Path (Join-Path $downloadDir '*') -Recurse -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Log "Cache cleanup skipped for ${downloadDir}: $($_.Exception.Message)"
    }

    Write-Log "Cleared Windows Update download cache"
}

function Invoke-EnforceMode {
    $pauseUntil = Get-PauseUntil
    if ($null -ne $pauseUntil) {
        Write-Log "Enforcement skipped because manual window remains active until $($pauseUntil.ToString('o'))"
        return
    }

    Set-DwordValue -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -Name 'NoAutoUpdate' -Value 1
    Set-DwordValue -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -Name 'AUOptions' -Value 2
    Set-DwordValue -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -Name 'NoAutoRebootWithLoggedOnUsers' -Value 1
    Set-DwordValue -Path 'HKLM:\SOFTWARE\Policies\Microsoft\WindowsStore' -Name 'AutoDownload' -Value 2

    Stop-UpdateProcesses

    foreach ($serviceName in @('UsoSvc', 'WaaSMedicSvc', 'wuauserv')) {
        Stop-ServiceSafe -Name $serviceName
        Set-ServiceStartValue -Name $serviceName -StartValue 4
    }

    foreach ($task in $TaskTargets) {
        Set-TaskEnabledState -TaskPath $task.TaskPath -TaskName $task.TaskName -Enabled $false
    }

    if ($CleanupDownloads) {
        Clear-DownloadCache
    }

    Write-Log 'Strict Windows Update enforcement completed'
}

function Invoke-AllowManualMode {
    if ($ManualWindowHours -lt 1) {
        throw 'ManualWindowHours must be at least 1.'
    }

    $pauseUntil = (Get-Date).AddHours($ManualWindowHours)
    $baseline = Load-Baseline

    Set-PauseWindow -PauseUntil $pauseUntil

    foreach ($serviceName in @('wuauserv', 'UsoSvc', 'WaaSMedicSvc')) {
        $startValue = Get-BaselineServiceStart -Baseline $baseline -ServiceName $serviceName
        Set-ServiceStartValue -Name $serviceName -StartValue $startValue
    }

    foreach ($task in $TaskTargets) {
        $enabled = Get-BaselineTaskEnabled -Baseline $baseline -TaskPath $task.TaskPath -TaskName $task.TaskName
        Set-TaskEnabledState -TaskPath $task.TaskPath -TaskName $task.TaskName -Enabled $enabled
    }

    Start-ServiceSafe -Name 'wuauserv'
    Start-ServiceSafe -Name 'UsoSvc'

    try {
        Start-Process 'ms-settings:windowsupdate' | Out-Null
    } catch {
        Write-Log "Failed to open Windows Update settings: $($_.Exception.Message)"
    }

    Write-Log "Manual update window opened for $ManualWindowHours hour(s)"
}

function Invoke-RestoreMode {
    $baseline = Load-Baseline
    Clear-PauseWindow

    if ($null -ne $baseline -and $null -ne $baseline.Policies) {
        Restore-DwordValue -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -Name 'NoAutoUpdate' -Value $baseline.Policies.WindowsUpdateAU.NoAutoUpdate
        Restore-DwordValue -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -Name 'AUOptions' -Value $baseline.Policies.WindowsUpdateAU.AUOptions
        Restore-DwordValue -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -Name 'NoAutoRebootWithLoggedOnUsers' -Value $baseline.Policies.WindowsUpdateAU.NoAutoRebootWithLoggedOnUsers
        Restore-DwordValue -Path 'HKLM:\SOFTWARE\Policies\Microsoft\WindowsStore' -Name 'AutoDownload' -Value $baseline.Policies.WindowsStore.AutoDownload
    }

    foreach ($serviceName in @('wuauserv', 'UsoSvc', 'WaaSMedicSvc')) {
        $startValue = Get-BaselineServiceStart -Baseline $baseline -ServiceName $serviceName
        Set-ServiceStartValue -Name $serviceName -StartValue $startValue
    }

    foreach ($task in $TaskTargets) {
        $enabled = Get-BaselineTaskEnabled -Baseline $baseline -TaskPath $task.TaskPath -TaskName $task.TaskName
        Set-TaskEnabledState -TaskPath $task.TaskPath -TaskName $task.TaskName -Enabled $enabled
    }

    Write-Log 'Windows Update guard restore completed'
}

Ensure-GuardRoot

switch ($Mode) {
    'Enforce' { Invoke-EnforceMode }
    'AllowManual' { Invoke-AllowManualMode }
    'Restore' { Invoke-RestoreMode }
    default { throw "Unsupported mode: $Mode" }
}
