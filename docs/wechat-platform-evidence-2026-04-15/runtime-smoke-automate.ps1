# Drive the already-open WeChat DevTools simulator to capture runtime liveness.
# Does NOT spawn a new DevTools - uses EnumWindows to find the one already
# running, then drives it via PostMessage (no focus stealing) and captures via
# PrintWindow (off-screen, no visual disruption).
#
# Scope (honest):
#   * Verifies runtime receives keyboard input and renders different pixels.
#   * Does NOT do a full playthrough - that would need game-state observation.
#
# All string literals in this file are ASCII on purpose: the PowerShell parser
# default codepage on zh-CN Windows mangles UTF-8 Chinese and breaks the file.
param(
  [string]$OutDir = "$PSScriptRoot\scene-coverage-runtime",
  [int]$KeyHoldMs = 80,
  [int]$StepDelayMs = 250
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

# Match the DevTools title without relying on literal Chinese characters.
# The process' window title is always wisdom - wechat-devtools Stable v...
# so match on 'wisdom' + 'Stable v' together (both unique, both ASCII).
$TitleRegex = 'wisdom'
$TitleRegex2 = 'Stable v'

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
  [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern IntPtr GetDC(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);
  [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleDC(IntPtr hDC);
  [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleBitmap(IntPtr hDC, int nWidth, int nHeight);
  [DllImport("gdi32.dll")] public static extern IntPtr SelectObject(IntPtr hDC, IntPtr hObject);
  [DllImport("gdi32.dll")] public static extern bool DeleteDC(IntPtr hDC);
  [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr hObject);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, int nFlags);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@ -ReferencedAssemblies System.Drawing,System.Windows.Forms

# --- Find the primary wisdom+Stable-v DevTools window (do NOT spawn) ---------
$hwndFound = [IntPtr]::Zero
$bestArea = 0
$cb = [Win+EnumWindowsProc]{
  param($hWnd, $lParam)
  if (-not [Win]::IsWindowVisible($hWnd)) { return $true }
  $sb = New-Object System.Text.StringBuilder 512
  [Win]::GetWindowText($hWnd, $sb, 512) | Out-Null
  $t = $sb.ToString()
  if ($t -match $TitleRegex -and $t -match $TitleRegex2) {
    $r = New-Object Win+RECT
    [Win]::GetWindowRect($hWnd, [ref]$r) | Out-Null
    $area = ($r.Right - $r.Left) * ($r.Bottom - $r.Top)
    if ($area -gt $script:bestArea) { $script:hwndFound = $hWnd; $script:bestArea = $area }
  }
  return $true
}
[Win]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null

if ($hwndFound -eq [IntPtr]::Zero) {
  Write-Error "Could not find DevTools window (title matching 'wisdom' + 'Stable v'). Open DevTools with project first."
  exit 2
}
$rect = New-Object Win+RECT
[Win]::GetWindowRect($hwndFound, [ref]$rect) | Out-Null
$w = $rect.Right - $rect.Left
$h = $rect.Bottom - $rect.Top
$hwndHex = ('0x' + $hwndFound.ToInt64().ToString('X'))
Write-Host ('[runtime] using existing DevTools HWND = ' + $hwndHex + '  size=' + $w + 'x' + $h)

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
  [Win]::PrintWindow($hWnd, $hdcDst, 2) | Out-Null  # PW_RENDERFULLCONTENT
  $bitmap = [System.Drawing.Bitmap]::FromHbitmap($bmp)
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
  [Win]::DeleteObject($bmp) | Out-Null
  [Win]::DeleteDC($hdcDst) | Out-Null
  [Win]::ReleaseDC($hWnd, $hdcSrc) | Out-Null
  Write-Host ('[runtime] saved: ' + $Path)
}

function Send-KeyViaPostMessage {
  param([IntPtr]$hWnd, [UInt16]$VK, [int]$HoldMs = $KeyHoldMs)
  $WM_KEYDOWN = 0x100
  $WM_KEYUP   = 0x101
  [Win]::PostMessage($hWnd, $WM_KEYDOWN, [IntPtr]$VK, [IntPtr]0) | Out-Null
  Start-Sleep -Milliseconds $HoldMs
  [Win]::PostMessage($hWnd, $WM_KEYUP,   [IntPtr]$VK, [IntPtr]0) | Out-Null
  Start-Sleep -Milliseconds $StepDelayMs
}

# --- Phase 1: baseline BEFORE any input ---------------------------------------
Screenshot $hwndFound (Join-Path $OutDir '00-runtime-baseline.png')

# --- Phase 2: drive keyboard via PostMessage (no focus stealing) --------------
$VK_D = 0x44; $VK_W = 0x57; $VK_J = 0x4A; $VK_K = 0x4B; $VK_E = 0x45

Write-Host '[runtime] sequence: hold-D x8 (walk right) + J (attack) + K (summon)'
foreach ($i in 1..8) { Send-KeyViaPostMessage $hwndFound $VK_D 120 }
Screenshot $hwndFound (Join-Path $OutDir '01-runtime-after-walk-right.png')

Send-KeyViaPostMessage $hwndFound $VK_J 120
Send-KeyViaPostMessage $hwndFound $VK_K 120
Screenshot $hwndFound (Join-Path $OutDir '02-runtime-after-attack-summon.png')

foreach ($i in 1..12) { Send-KeyViaPostMessage $hwndFound $VK_D 120 }
Send-KeyViaPostMessage $hwndFound $VK_W 150
Screenshot $hwndFound (Join-Path $OutDir '03-runtime-after-more-walk.png')

Send-KeyViaPostMessage $hwndFound $VK_E 100
Send-KeyViaPostMessage $hwndFound $VK_K 120
Screenshot $hwndFound (Join-Path $OutDir '04-runtime-after-echo-switch.png')

Write-Host ('[runtime] done. PNGs under ' + $OutDir)
Write-Host '[runtime] Next: Python PIL diff 00 vs 01/02/03/04 to verify pixel change = runtime is input-reactive'
