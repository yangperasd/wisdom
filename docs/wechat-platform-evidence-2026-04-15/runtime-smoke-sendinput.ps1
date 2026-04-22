# SendInput-based runtime smoke: close git modal, focus simulator, drive WASD+J+K,
# screenshot at checkpoints. Total focus-steal window: ~6-8 seconds.
# ASCII-only strings to stay parser-safe on zh-CN Windows.
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
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", SetLastError=true)] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);
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
    [FieldOffset(8)] public MOUSEINPUT mi;
    [FieldOffset(8)] public KEYBDINPUT ki;
  }
  [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT {
    public int dx, dy;
    public uint mouseData, dwFlags, time;
    public IntPtr dwExtraInfo;
  }
  [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT {
    public ushort wVk, wScan;
    public uint dwFlags, time;
    public IntPtr dwExtraInfo;
  }
}
'@ -ReferencedAssemblies System.Drawing,System.Windows.Forms

$hwndFound = [IntPtr]::Zero
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
    if ($area -gt $script:bestArea) { $script:hwndFound = $hWnd; $script:bestArea = $area }
  }
  return $true
}
[Win]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null
if ($hwndFound -eq [IntPtr]::Zero) { Write-Error "No DevTools window found"; exit 2 }

$rect = New-Object Win+RECT
[Win]::GetWindowRect($hwndFound, [ref]$rect) | Out-Null
$w = $rect.Right - $rect.Left
$h = $rect.Bottom - $rect.Top
Write-Host ('[runtime] DevTools HWND=0x' + $hwndFound.ToInt64().ToString('X') + ' ' + $w + 'x' + $h)

$prevFg = [Win]::GetForegroundWindow()
Write-Host ('[runtime] previous foreground HWND=0x' + $prevFg.ToInt64().ToString('X'))

function Focus-Window {
  param([IntPtr]$hWnd)
  # Windows 11 foreground lock trick: simulate an ALT keystroke FIRST to
  # mark the calling process as having user input. After that, SetForegroundWindow
  # is allowed to promote the target window.
  $a = New-Object 'Win+INPUT[]' 2
  $a[0].type = 1; $a[0].ki.wVk = 0x12; $a[0].ki.dwFlags = 0
  $a[1].type = 1; $a[1].ki.wVk = 0x12; $a[1].ki.dwFlags = $KEYEVENTF_KEYUP
  [Win]::SendInput(2, $a, $INPUT_SIZE) | Out-Null
  Start-Sleep -Milliseconds 80

  $thisTid = [Win]::GetCurrentThreadId()
  $targetPid = [uint32]0
  $targetTid = [Win]::GetWindowThreadProcessId($hWnd, [ref]$targetPid)
  [Win]::AttachThreadInput($thisTid, $targetTid, $true) | Out-Null
  [Win]::ShowWindow($hWnd, 9) | Out-Null
  [Win]::BringWindowToTop($hWnd) | Out-Null
  [Win]::SetForegroundWindow($hWnd) | Out-Null
  [Win]::AttachThreadInput($thisTid, $targetTid, $false) | Out-Null
  Start-Sleep -Milliseconds 300
}

$INPUT_SIZE = [System.Runtime.InteropServices.Marshal]::SizeOf([type]'Win+INPUT')
$KEYEVENTF_KEYUP = 2
$MOUSEEVENTF_LEFTDOWN = 0x2
$MOUSEEVENTF_LEFTUP = 0x4

function Click-Screen {
  param([int]$X, [int]$Y)
  [Win]::SetCursorPos($X, $Y) | Out-Null
  Start-Sleep -Milliseconds 60
  $a = New-Object 'Win+INPUT[]' 2
  $a[0].type = 0; $a[0].mi.dwFlags = $MOUSEEVENTF_LEFTDOWN
  $a[1].type = 0; $a[1].mi.dwFlags = $MOUSEEVENTF_LEFTUP
  [Win]::SendInput(2, $a, $INPUT_SIZE) | Out-Null
  Start-Sleep -Milliseconds 120
}

function Send-Key {
  param([UInt16]$VK, [int]$HoldMs = 120)
  $a = New-Object 'Win+INPUT[]' 1
  $a[0].type = 1; $a[0].ki.wVk = $VK; $a[0].ki.dwFlags = 0
  [Win]::SendInput(1, $a, $INPUT_SIZE) | Out-Null
  Start-Sleep -Milliseconds $HoldMs
  $b = New-Object 'Win+INPUT[]' 1
  $b[0].type = 1; $b[0].ki.wVk = $VK; $b[0].ki.dwFlags = $KEYEVENTF_KEYUP
  [Win]::SendInput(1, $b, $INPUT_SIZE) | Out-Null
  Start-Sleep -Milliseconds 120
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
  Write-Host ('[runtime] ' + $Path)
}

# --- START: focus-steal window (~6-8 sec total) -------------------------------
Focus-Window $hwndFound
$fgAfter = [Win]::GetForegroundWindow()
$isDevTools = ($fgAfter -eq $hwndFound)
Write-Host ('[runtime] foreground after Focus-Window: 0x' + $fgAfter.ToInt64().ToString('X') + '  isDevTools=' + $isDevTools)
if (-not $isDevTools) {
  Write-Host '[runtime] WARNING: Focus-Window did not bring DevTools to front. SendInput may hit wrong window.'
  Write-Host '[runtime] Trying ALT-TAB trick to force foreground...'
  # Send ALT key to reset foreground lock
  $a = New-Object 'Win+INPUT[]' 2
  $a[0].type = 1; $a[0].ki.wVk = 0x12; $a[0].ki.dwFlags = 0
  $a[1].type = 1; $a[1].ki.wVk = 0x12; $a[1].ki.dwFlags = $KEYEVENTF_KEYUP
  [Win]::SendInput(2, $a, $INPUT_SIZE) | Out-Null
  Start-Sleep -Milliseconds 100
  Focus-Window $hwndFound
  $fgAfter = [Win]::GetForegroundWindow()
  Write-Host ('[runtime] after ALT-trick, foreground=0x' + $fgAfter.ToInt64().ToString('X') + '  isDevTools=' + ($fgAfter -eq $hwndFound))
}

# Modal "Never" button in window-relative coords from programmatic pixel scan
# of 00-runtime-baseline: button text row at y=170, Never text center x=722 in
# the 1250x1000 DevTools window.
$neverX = $rect.Left + 722
$neverY = $rect.Top + 170
Write-Host ('[runtime] click Never at (' + $neverX + ',' + $neverY + ')')
Click-Screen $neverX $neverY
Start-Sleep -Milliseconds 400

# Click into the simulator viewport. Sim panel occupies top-right ~810..1240
# x, 60..700 y. Click near center of game canvas (where player stands).
$simX = $rect.Left + 1020
$simY = $rect.Top + 380
Write-Host ('[runtime] click simulator at (' + $simX + ',' + $simY + ')')
Click-Screen $simX $simY
Start-Sleep -Milliseconds 250

Screenshot $hwndFound (Join-Path $OutDir 'A-after-modal-close.png')

$VK_D = 0x44; $VK_W = 0x57; $VK_J = 0x4A; $VK_K = 0x4B; $VK_E = 0x45; $VK_S = 0x53

# First: hold D for ~2 seconds (walk right in StartCamp toward echo + plate)
foreach ($i in 1..12) { Send-Key $VK_D 150 }
Screenshot $hwndFound (Join-Path $OutDir 'B-after-walk-D-12x.png')

# Attack + summon a few times
foreach ($i in 1..3) { Send-Key $VK_J 120 }
foreach ($i in 1..3) { Send-Key $VK_K 120 }
Screenshot $hwndFound (Join-Path $OutDir 'C-after-attack-summon.png')

# Walk more, try jump / interact
foreach ($i in 1..10) { Send-Key $VK_D 150 }
Send-Key $VK_W 250
Screenshot $hwndFound (Join-Path $OutDir 'D-after-more-walk-and-jump.png')

# Switch echo, try summon again
Send-Key $VK_E 120
Send-Key $VK_K 120
Screenshot $hwndFound (Join-Path $OutDir 'E-after-echo-switch.png')

# Restore previous foreground window (best-effort)
if ($prevFg -ne [IntPtr]::Zero) { [Win]::SetForegroundWindow($prevFg) | Out-Null }
Write-Host '[runtime] done. Restored previous foreground.'
