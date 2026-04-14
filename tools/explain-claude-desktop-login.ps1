[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$cookiesPath = Join-Path $env:TEMP 'edge-claude-cookies-full.json'
if (-not (Test-Path -LiteralPath $cookiesPath)) {
    throw 'Browser cookie export not found. Run the launcher/debug flow first.'
}

$cookies = Get-Content -Raw -LiteralPath $cookiesPath | ConvertFrom-Json
$cookieHeader = ($cookies | ForEach-Object { '{0}={1}' -f $_.name, $_.value }) -join '; '
$headers = @{
    'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0'
    'Cookie' = $cookieHeader
    'Accept' = 'application/json, text/plain, */*'
    'Referer' = 'https://claude.ai/'
}

try {
    $response = Invoke-WebRequest -UseBasicParsing -Headers $headers 'https://claude.ai/api/account'
    [pscustomobject]@{
        status = $response.StatusCode
        body = $response.Content
    }
} catch {
    if (-not $_.Exception.Response) {
        throw
    }

    [pscustomobject]@{
        status = [int]$_.Exception.Response.StatusCode
        body = ''
    }
}
