# GUI-level WeChat DevTools touch smoke.
#
# This intentionally does not use miniprogram-automator or browser preview.
# It focuses an already-open WeChat DevTools window, drives the simulator with
# OS mouse input, and captures the DevTools window after each touch action.
param(
  [string]$OutDir = "temp\wechat-gui-touch-smoke",
  [int]$WindowLocalJoystickX = 832,
  [int]$WindowLocalJoystickY = 262,
  [int]$WindowLocalAttackX = 1174,
  [int]$WindowLocalAttackY = 265,
  [int]$WindowLocalSummonX = 1120,
  [int]$WindowLocalSummonY = 265,
  [int]$WindowLocalPauseX = 1136,
  [int]$WindowLocalPauseY = 122,
  [int]$WindowLocalNeverX = 706,
  [int]$WindowLocalNeverY = 170,
  [int]$WindowLocalTrustCloseX = 720,
  [int]$WindowLocalTrustCloseY = 91,
  [int]$WindowLocalConfigOkX = 738,
  [int]$WindowLocalConfigOkY = 162,
  [int]$TrustModalMaxDismissAttempts = 6,
  [int]$WindowWaitSeconds = 20,
  [int]$TargetWindowLeft = 20,
  [int]$TargetWindowTop = 20,
  [switch]$MoveToPrimary,
  [string]$PreferTitle = "staging",
  [string]$HwndHex = "",
  [switch]$ListWindows,
  [switch]$ListChildWindows,
  [switch]$AllowUnfocused,
  [switch]$AllowTrustModal,
  [switch]$DismissOnly,
  [switch]$UsePointerTouch,
  [switch]$UseWindowMessages
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir | Out-Null
}

Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WechatGuiSmokeWin32 {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc proc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr hWnd, EnumWindowsProc proc, IntPtr lParam);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", SetLastError=true)] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
  [DllImport("user32.dll", SetLastError=true)] public static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
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

  [DllImport("user32.dll", SetLastError=true)] public static extern bool InitializeTouchInjection(uint maxCount, uint dwMode);
  [DllImport("user32.dll", SetLastError=true)] public static extern bool InjectTouchInput(uint count, [In, MarshalAs(UnmanagedType.LPArray)] POINTER_TOUCH_INFO[] contacts);

  [StructLayout(LayoutKind.Sequential)] public struct POINT {
    public int X;
    public int Y;
  }
  [StructLayout(LayoutKind.Sequential)] public struct POINTER_INFO {
    public uint pointerType;
    public uint pointerId;
    public uint frameId;
    public uint pointerFlags;
    public IntPtr sourceDevice;
    public IntPtr hwndTarget;
    public POINT ptPixelLocation;
    public POINT ptHimetricLocation;
    public POINT ptPixelLocationRaw;
    public POINT ptHimetricLocationRaw;
    public uint dwTime;
    public uint historyCount;
    public int inputData;
    public uint dwKeyStates;
    public ulong PerformanceCount;
    public int ButtonChangeType;
  }
  [StructLayout(LayoutKind.Sequential)] public struct POINTER_TOUCH_INFO {
    public POINTER_INFO pointerInfo;
    public uint touchFlags;
    public uint touchMask;
    public RECT rcContact;
    public RECT rcContactRaw;
    public uint orientation;
    public uint pressure;
  }
}
'@ -ReferencedAssemblies System.Drawing

$inputSize = [System.Runtime.InteropServices.Marshal]::SizeOf([type]'WechatGuiSmokeWin32+INPUT')
$mouseLeftDown = 0x2
$mouseLeftUp = 0x4
$keyUp = 0x2
$wmMouseMove = 0x0200
$wmLButtonDown = 0x0201
$wmLButtonUp = 0x0202
$mkLButton = 0x0001
$pointerTouchInitialized = $false
$touchFeedbackDefault = 0x1
$pointerTypeTouch = 0x2
$pointerFlagNew = 0x1
$pointerFlagInRange = 0x2
$pointerFlagInContact = 0x4
$pointerFlagFirstButton = 0x10
$pointerFlagDown = 0x10000
$pointerFlagUpdate = 0x20000
$pointerFlagUp = 0x40000
$touchMaskContactArea = 0x1
$touchMaskOrientation = 0x2
$touchMaskPressure = 0x4
$gameplayPointerTouchEnabled = $false

function Ensure-PointerTouch {
  if ($script:pointerTouchInitialized) {
    return
  }

  $ok = [WechatGuiSmokeWin32]::InitializeTouchInjection(2, $script:touchFeedbackDefault)
  if (-not $ok) {
    $lastError = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
    Write-Error "InitializeTouchInjection failed with Win32 error $lastError."
    exit 5
  }
  $script:pointerTouchInitialized = $true
}

function New-TouchInfo {
  param(
    [int]$X,
    [int]$Y,
    [uint32]$Flags,
    [uint32]$PointerId = 1
  )

  $contactSize = 10
  $info = New-Object 'WechatGuiSmokeWin32+POINTER_TOUCH_INFO'
  $info.pointerInfo.pointerType = $script:pointerTypeTouch
  $info.pointerInfo.pointerId = $PointerId
  $info.pointerInfo.pointerFlags = $Flags
  $info.pointerInfo.ptPixelLocation.X = $X
  $info.pointerInfo.ptPixelLocation.Y = $Y
  $info.pointerInfo.ptHimetricLocation.X = $X
  $info.pointerInfo.ptHimetricLocation.Y = $Y
  $info.pointerInfo.ptPixelLocationRaw.X = $X
  $info.pointerInfo.ptPixelLocationRaw.Y = $Y
  $info.pointerInfo.ptHimetricLocationRaw.X = $X
  $info.pointerInfo.ptHimetricLocationRaw.Y = $Y
  $info.touchMask = $script:touchMaskContactArea -bor $script:touchMaskOrientation -bor $script:touchMaskPressure
  $info.rcContact.Left = $X - $contactSize
  $info.rcContact.Top = $Y - $contactSize
  $info.rcContact.Right = $X + $contactSize
  $info.rcContact.Bottom = $Y + $contactSize
  $info.rcContactRaw = $info.rcContact
  $info.orientation = 90
  # Windows touch injection expects pressure in the documented 0..1024 range.
  # Out-of-range pressure makes InjectTouchInput fail with ERROR_INVALID_PARAMETER.
  $info.pressure = 512
  return $info
}

function Inject-TouchPoint {
  param(
    [int]$X,
    [int]$Y,
    [uint32]$Flags,
    [uint32]$PointerId = 1
  )

  Ensure-PointerTouch
  $contacts = New-Object 'WechatGuiSmokeWin32+POINTER_TOUCH_INFO[]' 1
  $contacts[0] = New-TouchInfo $X $Y $Flags $PointerId
  $ok = [WechatGuiSmokeWin32]::InjectTouchInput(1, $contacts)
  if (-not $ok) {
    $lastError = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
    Write-Error "InjectTouchInput failed with Win32 error $lastError."
    exit 5
  }
}

function New-MouseInput {
  param([uint32]$Flags)
  $inputs = New-Object 'WechatGuiSmokeWin32+INPUT[]' 1
  $inputs[0].type = 0
  $inputs[0].mi.dwFlags = $Flags
  return $inputs
}

function Send-AltPulse {
  $inputs = New-Object 'WechatGuiSmokeWin32+INPUT[]' 2
  $inputs[0].type = 1
  $inputs[0].ki.wVk = 0x12
  $inputs[1].type = 1
  $inputs[1].ki.wVk = 0x12
  $inputs[1].ki.dwFlags = $script:keyUp
  [WechatGuiSmokeWin32]::SendInput(2, $inputs, $script:inputSize) | Out-Null
  Start-Sleep -Milliseconds 80
}

function Find-DevToolsWindows {
  $script:devtoolsCandidates = @()
  $script:preferTitlePattern = $PreferTitle
  $cb = [WechatGuiSmokeWin32+EnumWindowsProc]{
    param($hWnd, $lParam)
    if (-not [WechatGuiSmokeWin32]::IsWindowVisible($hWnd)) { return $true }

    $sb = New-Object System.Text.StringBuilder 512
    [WechatGuiSmokeWin32]::GetWindowText($hWnd, $sb, 512) | Out-Null
    $title = $sb.ToString()
    if (-not ($title -match 'wisdom' -and ($title -match 'Stable' -or $title -match 'WeChat'))) {
      return $true
    }

    $rect = New-Object WechatGuiSmokeWin32+RECT
    [WechatGuiSmokeWin32]::GetWindowRect($hWnd, [ref]$rect) | Out-Null
    $windowProcessId = [uint32]0
    [WechatGuiSmokeWin32]::GetWindowThreadProcessId($hWnd, [ref]$windowProcessId) | Out-Null
    $area = ($rect.Right - $rect.Left) * ($rect.Bottom - $rect.Top)
    $script:devtoolsCandidates += [pscustomobject]@{
      Hwnd = $hWnd
      HwndHex = ("0x{0:X}" -f $hWnd.ToInt64())
      Pid = $windowProcessId
      Title = $title
      Area = $area
      Top = $rect.Top
      Left = $rect.Left
      Width = $rect.Right - $rect.Left
      Height = $rect.Bottom - $rect.Top
      Prefer = ($title -match [regex]::Escape($script:preferTitlePattern))
    }
    return $true
  }
  [WechatGuiSmokeWin32]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null
  return $script:devtoolsCandidates
}

$deadline = (Get-Date).AddSeconds($WindowWaitSeconds)
$candidates = @()
do {
  $candidates = Find-DevToolsWindows
  if ($candidates.Count -gt 0) {
    break
  }
  Start-Sleep -Milliseconds 500
} while ((Get-Date) -lt $deadline)

if ($candidates.Count -eq 0) {
  Write-Error "No WeChat DevTools window for wisdom was found."
  exit 2
}

if ($ListWindows) {
  $sorted = $candidates | Sort-Object -Property @{ Expression = "Prefer"; Descending = $true }, @{ Expression = "Area"; Descending = $true }, @{ Expression = "Top"; Descending = $false }
  $sorted |
    Select-Object HwndHex,Pid,Title,Left,Top,Width,Height,Prefer |
    ConvertTo-Json -Depth 3 |
    Set-Content -Encoding UTF8 (Join-Path $OutDir "window-candidates.json")
  $sorted | Select-Object HwndHex,Pid,Title,Left,Top,Width,Height,Prefer | Format-Table -AutoSize
  exit 0
}

if ($HwndHex.Trim()) {
  $requested = [IntPtr]([Convert]::ToInt64($HwndHex.Trim().ToLowerInvariant().Replace("0x", ""), 16))
  $selected = $candidates | Where-Object { $_.Hwnd -eq $requested } | Select-Object -First 1
  if (-not $selected) {
    Write-Error "Requested HWND $HwndHex was not found among wisdom DevTools windows."
    exit 2
  }
} else {
  $selected = $candidates | Sort-Object -Property @{ Expression = "Prefer"; Descending = $true }, @{ Expression = "Area"; Descending = $true }, @{ Expression = "Top"; Descending = $false } | Select-Object -First 1
}

$script:devtoolsHwnd = $selected.Hwnd
$script:messageInputHwnd = $script:devtoolsHwnd

function Resolve-MessageInputHwnd {
  if (-not $UseWindowMessages) {
    return
  }

  $script:messageInputHwnd = $script:devtoolsHwnd
  $script:messageInputRect = $null
  $messageChildren = @()
  $childCallback = [WechatGuiSmokeWin32+EnumWindowsProc]{
    param($hWnd, $lParam)
    $rect = New-Object WechatGuiSmokeWin32+RECT
    [WechatGuiSmokeWin32]::GetWindowRect($hWnd, [ref]$rect) | Out-Null
    $width = $rect.Right - $rect.Left
    $height = $rect.Bottom - $rect.Top
    if ($width -le 100 -or $height -le 100 -or -not [WechatGuiSmokeWin32]::IsWindowVisible($hWnd)) {
      return $true
    }

    $className = New-Object System.Text.StringBuilder 256
    [WechatGuiSmokeWin32]::GetClassName($hWnd, $className, 256) | Out-Null
    $script:messageChildren += [pscustomobject]@{
      Hwnd = $hWnd
      Class = $className.ToString()
      Left = $rect.Left
      Top = $rect.Top
      Width = $width
      Height = $height
      Area = $width * $height
      Rect = $rect
    }
    return $true
  }
  $script:messageChildren = $messageChildren
  [WechatGuiSmokeWin32]::EnumChildWindows($script:devtoolsHwnd, $childCallback, [IntPtr]::Zero) | Out-Null
  $candidate = $script:messageChildren |
    Where-Object { $_.Class -match 'D3D|Chrome|Render|Widget|Window' } |
    Sort-Object Area -Descending |
    Select-Object -First 1
  if ($candidate) {
    $script:messageInputHwnd = $candidate.Hwnd
    $script:messageInputRect = $candidate.Rect
    Write-Host ("[wechat-gui] message input HWND=0x{0:X} class={1} rect={2},{3} {4}x{5}" -f $script:messageInputHwnd.ToInt64(), $candidate.Class, $candidate.Left, $candidate.Top, $candidate.Width, $candidate.Height)
  }
}

if ($ListChildWindows) {
  $script:childWindows = @()
  $childCallback = [WechatGuiSmokeWin32+EnumWindowsProc]{
    param($hWnd, $lParam)
    $rect = New-Object WechatGuiSmokeWin32+RECT
    [WechatGuiSmokeWin32]::GetWindowRect($hWnd, [ref]$rect) | Out-Null
    $width = $rect.Right - $rect.Left
    $height = $rect.Bottom - $rect.Top
    if ($width -le 10 -or $height -le 10) {
      return $true
    }

    $className = New-Object System.Text.StringBuilder 256
    $title = New-Object System.Text.StringBuilder 256
    [WechatGuiSmokeWin32]::GetClassName($hWnd, $className, 256) | Out-Null
    [WechatGuiSmokeWin32]::GetWindowText($hWnd, $title, 256) | Out-Null
    $script:childWindows += [pscustomobject]@{
      Hwnd = ("0x{0:X}" -f $hWnd.ToInt64())
      Class = $className.ToString()
      Title = $title.ToString()
      Left = $rect.Left
      Top = $rect.Top
      Width = $width
      Height = $height
      Visible = [WechatGuiSmokeWin32]::IsWindowVisible($hWnd)
    }
    return $true
  }
  [WechatGuiSmokeWin32]::EnumChildWindows($script:devtoolsHwnd, $childCallback, [IntPtr]::Zero) | Out-Null
  $script:childWindows |
    Sort-Object -Property @{ Expression = "Width"; Descending = $true }, @{ Expression = "Height"; Descending = $true } |
    Select-Object -First 120 |
    ConvertTo-Json -Depth 3 |
    Set-Content -Encoding UTF8 (Join-Path $OutDir "child-windows.json")
  $script:childWindows | Sort-Object Width -Descending | Select-Object -First 40 | Format-Table -AutoSize
  exit 0
}

function Update-DevToolsRect {
  $script:rect = New-Object WechatGuiSmokeWin32+RECT
  [WechatGuiSmokeWin32]::GetWindowRect($script:devtoolsHwnd, [ref]$script:rect) | Out-Null
  $script:width = $script:rect.Right - $script:rect.Left
  $script:height = $script:rect.Bottom - $script:rect.Top
}

Update-DevToolsRect
Write-Host ("[wechat-gui] selected title={0}" -f $selected.Title)
Write-Host ("[wechat-gui] HWND=0x{0:X} rect={1},{2} {3}x{4}" -f $script:devtoolsHwnd.ToInt64(), $script:rect.Left, $script:rect.Top, $script:width, $script:height)

function Mouse-Down {
  [WechatGuiSmokeWin32]::mouse_event($script:mouseLeftDown, 0, 0, 0, [UIntPtr]::Zero)
}

function Mouse-Up {
  [WechatGuiSmokeWin32]::mouse_event($script:mouseLeftUp, 0, 0, 0, [UIntPtr]::Zero)
}

function Convert-Point {
  param([int]$LocalX, [int]$LocalY)
  return @{
    X = $script:rect.Left + $LocalX
    Y = $script:rect.Top + $LocalY
  }
}

function Convert-MessageLParam {
  param([int]$ScreenX, [int]$ScreenY)
  $targetRect = if ($script:messageInputRect) { $script:messageInputRect } else { $script:rect }
  $x = [Math]::Max(0, [Math]::Min(65535, $ScreenX - $targetRect.Left))
  $y = [Math]::Max(0, [Math]::Min(65535, $ScreenY - $targetRect.Top))
  $value = (($y -band 0xFFFF) -shl 16) -bor ($x -band 0xFFFF)
  return [IntPtr]$value
}

function Send-WindowMouse {
  param([uint32]$Message, [int]$ScreenX, [int]$ScreenY, [int]$Buttons = 0)
  $lParam = Convert-MessageLParam $ScreenX $ScreenY
  $targetHwnd = if ($script:gameplayPointerTouchEnabled -and $script:messageInputHwnd -ne [IntPtr]::Zero) {
    $script:messageInputHwnd
  } else {
    $script:devtoolsHwnd
  }
  [WechatGuiSmokeWin32]::PostMessage($targetHwnd, $Message, [IntPtr]$Buttons, $lParam) | Out-Null
}

function Click-Local {
  param([int]$X, [int]$Y)
  $p = Convert-Point $X $Y
  [WechatGuiSmokeWin32]::SetCursorPos($p.X, $p.Y) | Out-Null
  Start-Sleep -Milliseconds 80
  if ($UseWindowMessages) {
    Send-WindowMouse $script:wmMouseMove $p.X $p.Y 0
    Start-Sleep -Milliseconds 40
    Send-WindowMouse $script:wmLButtonDown $p.X $p.Y $script:mkLButton
    Start-Sleep -Milliseconds 90
    Send-WindowMouse $script:wmLButtonUp $p.X $p.Y 0
  } elseif ($UsePointerTouch -and $script:gameplayPointerTouchEnabled) {
    Inject-TouchPoint $p.X $p.Y ($script:pointerFlagDown -bor $script:pointerFlagInRange -bor $script:pointerFlagInContact)
    Start-Sleep -Milliseconds 90
    Inject-TouchPoint $p.X $p.Y $script:pointerFlagUp
  } else {
    Mouse-Down
    Start-Sleep -Milliseconds 90
    Mouse-Up
  }
  Start-Sleep -Milliseconds 250
}

function Drag-Local {
  param([int]$StartX, [int]$StartY, [int]$EndX, [int]$EndY, [int]$Steps = 12)
  $start = Convert-Point $StartX $StartY
  [WechatGuiSmokeWin32]::SetCursorPos($start.X, $start.Y) | Out-Null
  Start-Sleep -Milliseconds 100
  if ($UseWindowMessages) {
    Send-WindowMouse $script:wmMouseMove $start.X $start.Y 0
    Start-Sleep -Milliseconds 40
    Send-WindowMouse $script:wmLButtonDown $start.X $start.Y $script:mkLButton
  } elseif ($UsePointerTouch -and $script:gameplayPointerTouchEnabled) {
    Inject-TouchPoint $start.X $start.Y ($script:pointerFlagDown -bor $script:pointerFlagInRange -bor $script:pointerFlagInContact)
  } else {
    Mouse-Down
  }
  for ($i = 1; $i -le $Steps; $i++) {
    $x = [int]($StartX + (($EndX - $StartX) * $i / $Steps))
    $y = [int]($StartY + (($EndY - $StartY) * $i / $Steps))
    $p = Convert-Point $x $y
    [WechatGuiSmokeWin32]::SetCursorPos($p.X, $p.Y) | Out-Null
    if ($UseWindowMessages) {
      Send-WindowMouse $script:wmMouseMove $p.X $p.Y $script:mkLButton
    } elseif ($UsePointerTouch -and $script:gameplayPointerTouchEnabled) {
      Inject-TouchPoint $p.X $p.Y ($script:pointerFlagUpdate -bor $script:pointerFlagInRange -bor $script:pointerFlagInContact)
    }
    Start-Sleep -Milliseconds 80
  }
  Start-Sleep -Milliseconds 450
  $end = Convert-Point $EndX $EndY
  if ($UseWindowMessages) {
    Send-WindowMouse $script:wmLButtonUp $end.X $end.Y 0
  } elseif ($UsePointerTouch -and $script:gameplayPointerTouchEnabled) {
    Inject-TouchPoint $end.X $end.Y $script:pointerFlagUp
  } else {
    Mouse-Up
  }
  Start-Sleep -Milliseconds 350
}

function Focus-DevTools {
  Send-AltPulse
  [WechatGuiSmokeWin32]::ShowWindow($script:devtoolsHwnd, 9) | Out-Null
  if ($MoveToPrimary) {
    [WechatGuiSmokeWin32]::MoveWindow($script:devtoolsHwnd, $TargetWindowLeft, $TargetWindowTop, $script:width, $script:height, $true) | Out-Null
    Start-Sleep -Milliseconds 250
  }
  [WechatGuiSmokeWin32]::BringWindowToTop($script:devtoolsHwnd) | Out-Null
  [WechatGuiSmokeWin32]::SetForegroundWindow($script:devtoolsHwnd) | Out-Null
  Start-Sleep -Milliseconds 350
  Update-DevToolsRect
  Resolve-MessageInputHwnd
  Write-Host ("[wechat-gui] restored rect={0},{1} {2}x{3}" -f $script:rect.Left, $script:rect.Top, $script:width, $script:height)
  Click-Local ([int]($script:width / 2)) 16
  Start-Sleep -Milliseconds 200

  $fg = [WechatGuiSmokeWin32]::GetForegroundWindow()
  $foregroundPid = [uint32]0
  [WechatGuiSmokeWin32]::GetWindowThreadProcessId($fg, [ref]$foregroundPid) | Out-Null
  $foregroundMatchesDevTools = ($fg -eq $script:devtoolsHwnd) -or ($foregroundPid -eq $selected.Pid)
  Write-Host ("[wechat-gui] foreground=0x{0:X} foregroundPid={1} targetPid={2} isDevTools={3}" -f $fg.ToInt64(), $foregroundPid, $selected.Pid, $foregroundMatchesDevTools)
  if (-not $foregroundMatchesDevTools -and -not $AllowUnfocused) {
    Write-Error "Unable to focus the selected WeChat DevTools window; refusing to send smoke input to an unknown foreground window."
    exit 3
  }
}

function Capture {
  param([string]$Name)
  $path = Join-Path $OutDir $Name
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    $hdcSrc = [IntPtr]::Zero
    $hdcDst = [IntPtr]::Zero
    $bmp = [IntPtr]::Zero
    $bitmap = $null
    try {
      $hdcSrc = [WechatGuiSmokeWin32]::GetDC($script:devtoolsHwnd)
      $hdcDst = [WechatGuiSmokeWin32]::CreateCompatibleDC($hdcSrc)
      $bmp = [WechatGuiSmokeWin32]::CreateCompatibleBitmap($hdcSrc, $script:width, $script:height)
      [WechatGuiSmokeWin32]::SelectObject($hdcDst, $bmp) | Out-Null
      [WechatGuiSmokeWin32]::PrintWindow($script:devtoolsHwnd, $hdcDst, 2) | Out-Null
      $bitmap = [System.Drawing.Bitmap]::FromHbitmap($bmp)
      $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
      Write-Host ("[wechat-gui] captured {0}" -f $path)
      return $path
    } catch {
      Write-Warning ("[wechat-gui] capture {0} attempt {1} failed: {2}" -f $Name, $attempt, $_.Exception.Message)
      Start-Sleep -Milliseconds 250
    } finally {
      if ($bitmap) { $bitmap.Dispose() }
      if ($bmp -ne [IntPtr]::Zero) { [WechatGuiSmokeWin32]::DeleteObject($bmp) | Out-Null }
      if ($hdcDst -ne [IntPtr]::Zero) { [WechatGuiSmokeWin32]::DeleteDC($hdcDst) | Out-Null }
      if ($hdcSrc -ne [IntPtr]::Zero) { [WechatGuiSmokeWin32]::ReleaseDC($script:devtoolsHwnd, $hdcSrc) | Out-Null }
    }
  }

  Write-Warning ("[wechat-gui] capture {0} failed after retries; continuing without this screenshot." -f $Name)
  return $path
}

function Test-BlockingModalInCapture {
  param([string]$Path)

  $bitmap = [System.Drawing.Bitmap]::FromFile($Path)
  try {
    # Current DevTools trust / config-error prompts are best detected by their
    # green primary action button, but the exact modal position drifts across
    # DevTools versions and Windows DPI settings. Keep the scan wide enough to
    # cover the whole upper editor area instead of a couple of brittle fixed
    # rectangles.
    $greenPixels = 0
    $scanMinX = [Math]::Max(320, [Math]::Floor($bitmap.Width * 0.34))
    $scanMaxX = [Math]::Min(780, [Math]::Floor($bitmap.Width * 0.78))
    $scanMinY = [Math]::Max(80, [Math]::Floor($bitmap.Height * 0.08))
    $scanMaxY = [Math]::Min(260, [Math]::Floor($bitmap.Height * 0.26))
    for ($y = $scanMinY; $y -le $scanMaxY; $y++) {
      for ($x = $scanMinX; $x -le $scanMaxX; $x++) {
        $pixel = $bitmap.GetPixel($x, $y)
        $isModalGreen =
          $pixel.G -ge 120 -and
          $pixel.R -ge 40 -and
          $pixel.R -le 140 -and
          $pixel.B -le 130 -and
          ($pixel.G - $pixel.R) -ge 25 -and
          ($pixel.G - $pixel.B) -ge 20
        if ($isModalGreen) {
          $greenPixels++
        }
      }
    }

    return $greenPixels -gt 120
  } finally {
    $bitmap.Dispose()
  }
}

function Find-ModalGreenButtonCenter {
  param([string]$Path)

  $bitmap = [System.Drawing.Bitmap]::FromFile($Path)
  try {
    $minX = $bitmap.Width
    $minY = $bitmap.Height
    $maxX = -1
    $maxY = -1
    $greenPixels = 0

    # Trust/config prompts render their primary action as a green button near
    # the upper editor area. Detect the button from pixels instead of relying
    # on DevTools-version-specific modal coordinates.
    $scanMinX = [Math]::Max(320, [Math]::Floor($bitmap.Width * 0.34))
    $scanMaxX = [Math]::Min(780, [Math]::Floor($bitmap.Width * 0.78))
    $scanMinY = [Math]::Max(80, [Math]::Floor($bitmap.Height * 0.08))
    $scanMaxY = [Math]::Min(260, [Math]::Floor($bitmap.Height * 0.26))
    for ($y = $scanMinY; $y -le $scanMaxY; $y++) {
      for ($x = $scanMinX; $x -le $scanMaxX; $x++) {
        $pixel = $bitmap.GetPixel($x, $y)
        $isModalGreen =
          $pixel.G -ge 120 -and
          $pixel.R -ge 40 -and
          $pixel.R -le 140 -and
          $pixel.B -le 130 -and
          ($pixel.G - $pixel.R) -ge 25 -and
          ($pixel.G - $pixel.B) -ge 20
        if ($isModalGreen) {
          $greenPixels++
          if ($x -lt $minX) { $minX = $x }
          if ($x -gt $maxX) { $maxX = $x }
          if ($y -lt $minY) { $minY = $y }
          if ($y -gt $maxY) { $maxY = $y }
        }
      }
    }

    if ($greenPixels -lt 120 -or $maxX -lt $minX -or $maxY -lt $minY) {
      return $null
    }

    return [PSCustomObject]@{
      X = [int](($minX + $maxX) / 2)
      Y = [int](($minY + $maxY) / 2)
      Pixels = $greenPixels
    }
  } finally {
    $bitmap.Dispose()
  }
}

Focus-DevTools

# DevTools sometimes opens with a trust modal. We first try to dismiss it, then
# fail fast if it remains, because modal-covered screenshots are not gameplay
# evidence.
$modalProbePath = Capture "00-modal-probe.png"
$blockingModalPresent = Test-BlockingModalInCapture $modalProbePath
for ($i = 0; $blockingModalPresent -and $i -lt $TrustModalMaxDismissAttempts; $i++) {
  $greenButtonCenter = Find-ModalGreenButtonCenter $modalProbePath
  if ($null -ne $greenButtonCenter) {
    Write-Host ("[wechat-gui] clicking modal green button center={0},{1} pixels={2}" -f $greenButtonCenter.X, $greenButtonCenter.Y, $greenButtonCenter.Pixels)
    Click-Local $greenButtonCenter.X $greenButtonCenter.Y
  } else {
    Click-Local $WindowLocalNeverX $WindowLocalNeverY
    Start-Sleep -Milliseconds 300
    Click-Local $WindowLocalTrustCloseX $WindowLocalTrustCloseY
    Start-Sleep -Milliseconds 300
    Click-Local $WindowLocalConfigOkX $WindowLocalConfigOkY
  }
  Start-Sleep -Milliseconds 500
  $modalProbePath = Capture ("00-modal-dismiss-attempt-{0}.png" -f ($i + 1))
  $blockingModalPresent = Test-BlockingModalInCapture $modalProbePath
}

if ($blockingModalPresent -and -not $AllowTrustModal) {
  Write-Error "A WeChat DevTools blocking modal is still visible; refusing to continue with modal-covered GUI evidence."
  exit 4
}

if ($DismissOnly) {
  Write-Host "[wechat-gui] modal dismiss-only complete"
  exit 0
}

Start-Sleep -Milliseconds 900
Capture "00-before-touch.png"

# Focus the simulator with a plain mouse click first; pointer-touch injection is
# reserved for gameplay pixels because DevTools chrome/modals reject touch
# contacts on some Windows builds.
$script:gameplayPointerTouchEnabled = $false
Click-Local $WindowLocalJoystickX $WindowLocalJoystickY
Capture "01-after-focus-click.png"

$script:gameplayPointerTouchEnabled = $true
Drag-Local $WindowLocalJoystickX $WindowLocalJoystickY ($WindowLocalJoystickX + 64) $WindowLocalJoystickY
Capture "02-after-joystick-drag-right.png"

Click-Local $WindowLocalAttackX $WindowLocalAttackY
Capture "03-after-attack-click.png"

Click-Local $WindowLocalSummonX $WindowLocalSummonY
Capture "04-after-summon-click.png"

Click-Local $WindowLocalPauseX $WindowLocalPauseY
Capture "05-after-pause-click.png"

$hashes = Get-ChildItem -Path $OutDir -Filter "*.png" |
  Sort-Object Name |
  ForEach-Object {
    $hash = Get-FileHash -Algorithm SHA256 -Path $_.FullName
    [pscustomobject]@{
      name = $_.Name
      sha256 = $hash.Hash
      bytes = $_.Length
    }
  }
$hashes | ConvertTo-Json -Depth 3 | Set-Content -Encoding UTF8 (Join-Path $OutDir "capture-hashes.json")
if (($hashes.sha256 | Select-Object -Unique).Count -le 1) {
  Write-Warning "[wechat-gui] all screenshots have identical hashes; this usually means input did not change runtime state."
}

Write-Host "[wechat-gui] done"
