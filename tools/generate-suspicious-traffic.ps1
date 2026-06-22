# Wrapper — scripts moved to main-app/scripts/
# Usage:
#   .\tools\generate-suspicious-traffic.ps1 -Token "<JWT>"
#   .\tools\generate-suspicious-traffic.ps1 -Email "user@example.com" -Password "secret" -SeedLogs

param(
  [string]$Token,
  [string]$Email,
  [string]$Password,
  [string]$Base = "http://localhost:3000",
  [string]$Phases = "auth,agents,paths,forbidden,burst",
  [switch]$SeedLogs
)

$scriptPath = Join-Path $PSScriptRoot "..\main-app\scripts\generate-suspicious-traffic.ps1"

if (-not (Test-Path $scriptPath)) {
  Write-Error "Script not found: $scriptPath"
}

$params = @{
  Base   = $Base
  Phases = ($Phases -replace '^auth,?', '' -replace ',auth', '' -replace 'auth', 'agents')
}
if ($Token) { $params.Token = $Token }
if ($Email) { $params.Email = $Email }
if ($Password) { $params.Password = $Password }
if ($SeedLogs -or ($Phases -match 'auth')) { $params.SeedLogs = $true }

& $scriptPath @params
