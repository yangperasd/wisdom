[CmdletBinding()]
param(
    [switch]$DeepReset,
    [int]$WaitSeconds = 8,
    [switch]$OutputJson
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step {
    param([string]$Message)
    Write-Host "== $Message =="
}

function Get-ClaudeProcesses {
    Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -like 'claude*' }
}

function Stop-ClaudeProcesses {
    $processes = @(Get-ClaudeProcesses)
    if ($processes.Count -eq 0) {
        return
    }

    $processes | Stop-Process -Force
    Start-Sleep -Seconds 2
}

function Get-ClaudeExecutable {
    $registryPaths = @(
        'Registry::HKEY_CURRENT_USER\Software\Classes\claude\shell\open\command',
        'Registry::HKEY_CLASSES_ROOT\claude\shell\open\command'
    )

    foreach ($path in $registryPaths) {
        $value = (Get-ItemProperty -Path $path -ErrorAction SilentlyContinue).'(default)'
        if ($value -match '"([^"]*claude\.exe)"') {
            $candidate = $Matches[1]
            if (Test-Path -LiteralPath $candidate) {
                return $candidate
            }
        }
    }

    $fallback = Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA 'AnthropicClaude') -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like 'app-*' } |
        Sort-Object Name -Descending |
        ForEach-Object { Join-Path $_.FullName 'claude.exe' } |
        Where-Object { Test-Path -LiteralPath $_ } |
        Select-Object -First 1

    if ($fallback) {
        return $fallback
    }

    throw 'Unable to locate Claude Desktop executable.'
}

function Backup-Directory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Source,
        [Parameter(Mandatory = $true)]
        [string]$Destination
    )

    if (-not (Test-Path -LiteralPath $Source)) {
        return
    }

    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    robocopy $Source $Destination /E /COPY:DAT /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
}

function Invoke-TargetedReset {
    param([string]$ClaudeRoot)

    $directories = @(
        'Network',
        'Local Storage',
        'Session Storage',
        'IndexedDB',
        'WebStorage',
        'SharedStorage',
        'blob_storage',
        'Cache',
        'Code Cache',
        'GPUCache',
        'DawnGraphiteCache',
        'DawnWebGPUCache',
        'Shared Dictionary'
    )
    $files = @(
        'SharedStorage-wal',
        'DIPS',
        'DIPS-wal',
        'lockfile'
    )

    foreach ($relative in $directories) {
        $target = Join-Path $ClaudeRoot $relative
        if (Test-Path -LiteralPath $target) {
            Remove-Item -LiteralPath $target -Recurse -Force
        }
    }

    foreach ($relative in $files) {
        $target = Join-Path $ClaudeRoot $relative
        if (Test-Path -LiteralPath $target) {
            Remove-Item -LiteralPath $target -Force
        }
    }
}

function Get-RecentLogText {
    param([string]$LogPath)

    if (-not (Test-Path -LiteralPath $LogPath)) {
        return ''
    }

    return [string]::Join([Environment]::NewLine, (Get-Content -LiteralPath $LogPath -Tail 120))
}

function Get-LastActiveOrgCount {
    param([string]$CookieDbPath)

    $sqlite = Get-Command sqlite3 -ErrorAction SilentlyContinue
    if (-not $sqlite) {
        return $null
    }

    if (-not (Test-Path -LiteralPath $CookieDbPath)) {
        return $null
    }

    $tempDb = Join-Path $env:TEMP 'claude-cookies-verify.db'
    Copy-Item -LiteralPath $CookieDbPath -Destination $tempDb -Force
    $count = & $sqlite.Source $tempDb "select count(*) from cookies where name='lastActiveOrg';"
    Remove-Item -LiteralPath $tempDb -Force -ErrorAction SilentlyContinue

    if (-not $count) {
        return 0
    }

    return [int]($count | Select-Object -First 1)
}

$roamingClaude = Join-Path $env:APPDATA 'Claude'
$roamingClaude3p = Join-Path $env:APPDATA 'Claude-3p'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $env:APPDATA ("Claude-repair-$timestamp")
$claudeExe = Get-ClaudeExecutable

Write-Step "Stopping Claude"
Stop-ClaudeProcesses

Write-Step "Backing up current Claude data"
Backup-Directory -Source $roamingClaude -Destination (Join-Path $backupRoot 'Claude')
Backup-Directory -Source $roamingClaude3p -Destination (Join-Path $backupRoot 'Claude-3p')

if ($DeepReset) {
    Write-Step "Applying deep reset"
    foreach ($path in @($roamingClaude, $roamingClaude3p)) {
        if (Test-Path -LiteralPath $path) {
            Remove-Item -LiteralPath $path -Recurse -Force
        }
    }
} else {
    Write-Step "Applying targeted reset"
    if (Test-Path -LiteralPath $roamingClaude) {
        Invoke-TargetedReset -ClaudeRoot $roamingClaude
    }
}

Write-Step "Starting Claude"
Start-Process -FilePath $claudeExe | Out-Null
Start-Sleep -Seconds $WaitSeconds

$logPath = Join-Path $roamingClaude 'logs\main.log'
$recentLog = Get-RecentLogText -LogPath $logPath
$logoutDuringIpc = $recentLog -match 'User logged out during IPC wait'
$missingAccountContext = $recentLog -match 'accountId=null, orgId=null'
$activeLoggedIn = $recentLog -match 'claude\.ai account active and logged in'

Write-Step "Stopping Claude for cookie inspection"
Stop-ClaudeProcesses

$lastActiveOrgCount = Get-LastActiveOrgCount -CookieDbPath (Join-Path $roamingClaude 'Network\Cookies')

Write-Step "Restarting Claude"
Start-Process -FilePath $claudeExe | Out-Null

$status = 'needs_manual_login'
$summary = 'Reset completed. Claude is open again and waiting for a manual login attempt.'

if ($logoutDuringIpc -or $missingAccountContext) {
    $status = 'still_broken'
    $summary = 'Claude still reports login state without account/org context. The local reset did not fix the issue.'
} elseif ($activeLoggedIn -and $lastActiveOrgCount -eq 0) {
    $status = 'still_broken'
    $summary = 'Claude claims it is logged in, but no lastActiveOrg cookie exists. The activity context is still missing.'
}

$result = [ordered]@{
    timestamp = $timestamp
    deepReset = [bool]$DeepReset
    backupRoot = $backupRoot
    claudeExecutable = $claudeExe
    logPath = $logPath
    activeLoggedIn = [bool]$activeLoggedIn
    logoutDuringIpc = [bool]$logoutDuringIpc
    missingAccountContext = [bool]$missingAccountContext
    lastActiveOrgCount = $lastActiveOrgCount
    status = $status
    summary = $summary
}

if ($OutputJson) {
    $result | ConvertTo-Json -Depth 4
} else {
    Write-Step "Result"
    $result.GetEnumerator() | ForEach-Object {
        Write-Host ("{0}: {1}" -f $_.Key, $_.Value)
    }
}

if ($status -eq 'still_broken') {
    exit 1
}
