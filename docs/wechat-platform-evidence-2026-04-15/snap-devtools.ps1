# Capture WeChat DevTools main window via Win32 PrintWindow
# Usage:
#   powershell -ExecutionPolicy Bypass -File docs/wechat-platform-evidence-2026-04-15/snap-devtools.ps1
# Output (always these two stable filenames, overwritten on re-run; matches README file manifest):
#   docs/wechat-platform-evidence-2026-04-15/devtools-startcamp-loaded.png            (first matching HWND)
#   docs/wechat-platform-evidence-2026-04-15/devtools-startcamp-loaded-secondary.png  (second matching HWND, if any)
# If DevTools happens to register 3+ matching HWNDs, the extras are SKIPPED
# (logged with a NOTE) rather than spilled into an un-manifested file --
# the README file manifest must stay authoritative.
#
# No foreground-grab, no full-screen capture. PrintWindow(..., PW_RENDERFULLCONTENT)
# renders the target window's backing store directly to a bitmap, so it works
# even if the window is covered / minimized (NW.js windows respond fine).

Add-Type -AssemblyName System.Drawing,System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.Text;
public class Snap {
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int max);
    [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    public const uint PW_RENDERFULLCONTENT = 0x00000002;
    public static List<IntPtr> FindByTitleSubstring(string needle) {
        var r = new List<IntPtr>();
        EnumWindows((h, _) => {
            if (!IsWindowVisible(h)) return true;
            int len = GetWindowTextLength(h);
            if (len <= 0) return true;
            var sb = new StringBuilder(len + 1);
            GetWindowText(h, sb, sb.Capacity);
            if (sb.ToString().IndexOf(needle, StringComparison.OrdinalIgnoreCase) >= 0) r.Add(h);
            return true;
        }, IntPtr.Zero);
        return r;
    }
    public static bool SnapWindow(IntPtr h, string outPath, out int w, out int hh) {
        RECT r; GetWindowRect(h, out r);
        w = r.Right - r.Left; hh = r.Bottom - r.Top;
        if (w <= 0 || hh <= 0) return false;
        using (var bmp = new Bitmap(w, hh, PixelFormat.Format32bppArgb))
        using (var g = Graphics.FromImage(bmp)) {
            IntPtr hdc = g.GetHdc();
            bool ok = PrintWindow(h, hdc, PW_RENDERFULLCONTENT);
            g.ReleaseHdc(hdc);
            if (!ok) return false;
            bmp.Save(outPath, ImageFormat.Png);
        }
        return true;
    }
}
'@ -ReferencedAssemblies System.Drawing,System.Windows.Forms

# Filter to windows whose title contains "wisdom" (the current Cocos project
# name -- DevTools puts the project folder name in its window title). If no
# project match, fall back to the DevTools version number so this script still
# works when the user renames the project.
$hwnds = [Snap]::FindByTitleSubstring("wisdom")
if ($hwnds.Count -eq 0) {
    Write-Host "no 'wisdom' windows; falling back to version substring"
    $hwnds = [Snap]::FindByTitleSubstring("v2.01")
}
Write-Host "candidates: $($hwnds.Count)"

$outDir = Split-Path -Parent $MyInvocation.MyCommand.Path
# Only process the first two matching HWNDs and write them to stable filenames.
# Any extra HWND (DevTools sometimes registers 3+ top-level windows for the
# same project, e.g. dev panels) is deliberately SKIPPED rather than spilled
# into an un-manifested file -- the README file manifest must stay authoritative.
$stableNames = @("devtools-startcamp-loaded.png", "devtools-startcamp-loaded-secondary.png")
if ($hwnds.Count -gt $stableNames.Count) {
    Write-Host ("NOTE: found $($hwnds.Count) matching HWNDs; only processing first " + $stableNames.Count + " to keep the file manifest stable. Extras ignored.")
}
$take = [Math]::Min($hwnds.Count, $stableNames.Count)
for ($i = 0; $i -lt $take; $i++) {
    $h = $hwnds[$i]
    $out = Join-Path $outDir $stableNames[$i]
    $w = 0; $hh = 0
    $ok = [Snap]::SnapWindow($h, $out, [ref]$w, [ref]$hh)
    if ($ok) {
        $sz = (Get-Item $out).Length
        Write-Host ("SAVED HWND=0x{0:X} size={1}x{2} file={3} bytes={4}" -f $h.ToInt64(), $w, $hh, $out, $sz)
    } else {
        Write-Host ("FAILED HWND=0x{0:X}" -f $h.ToInt64())
    }
}
