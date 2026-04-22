# Runtime smoke: assumes user has manually clicked DevTools simulator panel
# so it has keyboard focus. This script does NOT touch foreground - just sends
# WASD/J/K via SendInput and screenshots via PrintWindow at checkpoints.
# Total runtime ~6 seconds.
param(
  [string]$OutDir = "$PSScriptRoot\scene-coverage-runtime"
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Drawing;
using System.Drawing.Imaging;
public class Win {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc proc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern IntPtr GetDC(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);
  [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleDC(IntPtr hDC);
  [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleBitmap(IntPtr hDC, int nWidth, int nHeight);
  [DllImport("gdi32.dll")] public static extern IntPtr SelectObject(IntPtr hDC, IntPtr hObject);
  [DllImport("gdi32.dll")] public static extern bool DeleteDC(IntPtr hDC);
  [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr hObject);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, int nFlags);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Explicit)] public struct INPUT {
    [FieldOffset(0)] public int type;
    [FieldOffset(8)] public KEYBDINPUT ki;
  }
  [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT {
    public ushort wVk, wScan;
    public uint dwFlags, time;
    public IntPtr dwExtraInfo;
  }
}
'@ -ReferencedAssemblies System.Drawing,System.Windows.Forms

# Find DevTools window for screenshots only (no focus manipulation)
$hwndDevtools = [IntPtr]::Zero
$bestArea = 0
$cb = [Win+EnumWindowsProc]{
  param($hWnd, $lParam)
  if (-not [Win]::IsWindowVisible($hWnd)) { return $true }
  $sb = New-Object System.Text.StringBuilder 512
  [Win]::GetWindowText($hWnd, $sb, 512) | Out-Null
  $t = $sb.ToString()
  if ($t -match 'wisdom' -and $t -match 'Stable v') {
    $r = New-Object Win+RECT
    [Win]::GetWindowRect($hWnd, [ref]$r) | Out-Null
    $area = ($r.Right - $r.Left) * ($r.Bottom - $r.Top)
    if ($area -gt $script:bestArea) { $script:hwndDevtools = $hWnd; $script:bestArea = $area }
  }
  return $true
}
[Win]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null
if ($hwndDevtools -eq [IntPtr]::Zero) { Write-Error "No DevTools window found"; exit 2 }

Write-Host ('[runtime] DevTools HWND=0x' + $hwndDevtools.ToInt64().ToString('X'))
Write-Host '[runtime] Waiting up to 15 seconds for you to focus DevTools simulator...'
Write-Host '[runtime] (Click anywhere on the simulator panel; script auto-fires when detected)'
$attempts = 0
$maxAttempts = 30  # 30 * 500ms = 15 seconds
$ready = $false
while ($attempts -lt $maxAttempts) {
  $fg = [Win]::GetForegroundWindow()
  if ($fg -eq $hwndDevtools) {
    Write-Host ('[runtime]   detected DevTools as foreground after ' + ($attempts * 500) + 'ms')
    $ready = $true
    Start-Sleep -Milliseconds 200
    break
  }
  Start-Sleep -Milliseconds 500
  $attempts++
  if ($attempts % 4 -eq 0) {
    Write-Host ('[runtime]   waiting... ' + ($attempts / 2) + 's elapsed, foreground HWND=0x' + $fg.ToInt64().ToString('X'))
  }
}
if (-not $ready) {
  Write-Host '[runtime] TIMEOUT: DevTools never became foreground. Aborting.'
  exit 3
}

$INPUT_SIZE = [System.Runtime.InteropServices.Marshal]::SizeOf([type]'Win+INPUT')
$KEYEVENTF_KEYUP = 2

function Send-Key {
  param([UInt16]$VK, [int]$HoldMs = 100)
  $a = New-Object 'Win+INPUT[]' 1
  $a[0].type = 1; $a[0].ki.wVk = $VK; $a[0].ki.dwFlags = 0
  [Win]::SendInput(1, $a, $INPUT_SIZE) | Out-Null
  Start-Sleep -Milliseconds $HoldMs
  $b = New-Object 'Win+INPUT[]' 1
  $b[0].type = 1; $b[0].ki.wVk = $VK; $b[0].ki.dwFlags = $KEYEVENTF_KEYUP
  [Win]::SendInput(1, $b, $INPUT_SIZE) | Out-Null
  Start-Sleep -Milliseconds 100
}

function Screenshot {
  param([IntPtr]$hWnd, [string]$Path)
  $r = New-Object Win+RECT
  [Win]::GetWindowRect($hWnd, [ref]$r) | Out-Null
  $ww = $r.Right - $r.Left
  $hh = $r.Bottom - $r.Top
  $hdcSrc = [Win]::GetDC($hWnd)
  $hdcDst = [Win]::CreateCompatibleDC($hdcSrc)
  $bmp = [Win]::CreateCompatibleBitmap($hdcSrc, $ww, $hh)
  [Win]::SelectObject($hdcDst, $bmp) | Out-Null
  [Win]::PrintWindow($hWnd, $hdcDst, 2) | Out-Null
  $bitmap = [System.Drawing.Bitmap]::FromHbitmap($bmp)
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
  [Win]::DeleteObject($bmp) | Out-Null
  [Win]::DeleteDC($hdcDst) | Out-Null
  [Win]::ReleaseDC($hWnd, $hdcSrc) | Out-Null
  Write-Host ('[runtime] saved: ' + $Path)
}

# Cocos KeyCode mapping: W=87 A=65 S=83 D=68 J=74 K=75 Q=81 E=69
$VK_D = 0x44; $VK_W = 0x57; $VK_J = 0x4A; $VK_K = 0x4B

# Phase 0: baseline before any input
Screenshot $hwndDevtools (Join-Path $OutDir 'F0-baseline-focused.png')

# Phase 1: walk right (D) sustained
Write-Host '[runtime] phase 1: walk right'
foreach ($i in 1..10) { Send-Key $VK_D 110 }
Screenshot $hwndDevtools (Join-Path $OutDir 'F1-after-walk-right.png')

# Phase 2: attack
Write-Host '[runtime] phase 2: attack'
foreach ($i in 1..3) { Send-Key $VK_J 100 }
Screenshot $hwndDevtools (Join-Path $OutDir 'F2-after-attack.png')

# Phase 3: summon (place echo box)
Write-Host '[runtime] phase 3: summon'
foreach ($i in 1..2) { Send-Key $VK_K 100 }
Screenshot $hwndDevtools (Join-Path $OutDir 'F3-after-summon.png')

# Phase 4: walk more
Write-Host '[runtime] phase 4: more walk'
foreach ($i in 1..15) { Send-Key $VK_D 110 }
Send-Key $VK_W 200
Screenshot $hwndDevtools (Join-Path $OutDir 'F4-after-more-walk.png')

Write-Host '[runtime] done. PNGs:'
Get-ChildItem $OutDir -Filter 'F*.png' | ForEach-Object { Write-Host ('  ' + $_.FullName) }
