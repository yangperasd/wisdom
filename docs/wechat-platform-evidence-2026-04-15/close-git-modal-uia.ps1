# Close the DevTools git-repository modal dialog using UI Automation API.
# UIA walks accessibility tree — does NOT require foreground focus.
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$root = [System.Windows.Automation.AutomationElement]::RootElement

# Find any AutomationElement whose Name starts with "Never" (the button text)
$condName = New-Object System.Windows.Automation.PropertyCondition(
  [System.Windows.Automation.AutomationElement]::NameProperty, 'Never')
$condType = New-Object System.Windows.Automation.PropertyCondition(
  [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
  [System.Windows.Automation.ControlType]::Button)
$cond = New-Object System.Windows.Automation.AndCondition($condName, $condType)

$tree = [System.Windows.Automation.TreeScope]::Descendants
$button = $root.FindFirst($tree, $cond)
if ($button) {
  Write-Host ('[uia] found Never button: Name=' + $button.Current.Name + ' BoundingRect=' + $button.Current.BoundingRectangle)
  $invokePattern = $button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
  if ($invokePattern) {
    $invokePattern.Invoke()
    Write-Host '[uia] invoked Never button (no focus steal)'
  } else {
    Write-Host '[uia] Button found but no Invoke pattern available'
  }
} else {
  Write-Host '[uia] no "Never" button found anywhere in UI Automation tree'
  # Broader search: any button with name containing "Never"
  $anyBtn = $root.FindAll($tree, $condType)
  Write-Host ('[uia] total buttons visible: ' + $anyBtn.Count)
  foreach ($b in $anyBtn) {
    $n = $b.Current.Name
    if ($n -match 'Never|Always|Yes' -and $n.Length -lt 20) {
      Write-Host ('  candidate: ' + $n)
    }
  }
}
