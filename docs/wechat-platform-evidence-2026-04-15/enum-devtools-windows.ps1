Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class WinApi {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc proc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, StringBuilder name, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@

$list = New-Object System.Collections.ArrayList
$null = [WinApi]::EnumWindows({
  param($hWnd, $lParam)
  if (-not [WinApi]::IsWindowVisible($hWnd)) { return $true }
  $sb = New-Object System.Text.StringBuilder 512
  [WinApi]::GetWindowText($hWnd, $sb, 512) | Out-Null
  $title = $sb.ToString()
  $cls = New-Object System.Text.StringBuilder 256
  [WinApi]::GetClassName($hWnd, $cls, 256) | Out-Null
  $procId = [uint32]0
  [WinApi]::GetWindowThreadProcessId($hWnd, [ref]$procId) | Out-Null
  $rect = New-Object WinApi+RECT
  [WinApi]::GetWindowRect($hWnd, [ref]$rect) | Out-Null
  $w = $rect.Right - $rect.Left
  $h = $rect.Bottom - $rect.Top
  if ($title -match 'wisdom|微信开发|WeChat|Cocos|simulator|模拟器|DevTool' -or $cls.ToString() -match 'nw|Chrome') {
    $script:list.Add([pscustomobject]@{hWnd=('0x{0:X}' -f $hWnd.ToInt64()); title=$title; cls=$cls.ToString(); procId=$procId; w=$w; h=$h}) | Out-Null
  }
  return $true
}, [IntPtr]::Zero)
$list | Format-Table -AutoSize
