# Generates suspicious traffic for testing admin /users/admin/statistics.
#
# Usage:
#   .\scripts\generate-suspicious-traffic.ps1 -Token "<JWT>"
#   .\scripts\generate-suspicious-traffic.ps1 -Email "user@example.com" -Password "secret"
#   .\scripts\generate-suspicious-traffic.ps1 -Email "user@example.com" -Password "secret" -SeedLogs
#   .\scripts\generate-suspicious-traffic.ps1 -Token "<JWT>" -Base "https://your-app.up.railway.app"

param(
  [string]$Token,
  [string]$Email,
  [string]$Password,
  [string]$Base = "http://localhost:3000",
  [string]$Phases = "agents,paths,forbidden,burst",
  [switch]$SeedLogs,
  [switch]$DryRunSeed
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

Push-Location $rootDir
try {
  $nodeArgs = @("scripts/generate-suspicious-traffic.cjs", "--base", $Base, "--phases", $Phases)

  if ($Token) {
    $nodeArgs += @("--token", $Token)
  } elseif ($Email -and $Password) {
    $nodeArgs += @("--email", $Email, "--password", $Password)
  } else {
    Write-Host "Provide -Token or (-Email and -Password)" -ForegroundColor Red
    exit 1
  }

  node @nodeArgs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  if ($SeedLogs) {
    Write-Host "`n=== Seeding action_log (auth_errors, multi_ip) ===" -ForegroundColor Cyan
    $seedArgs = @("scripts/seed-suspicious-action-logs.cjs")
    if ($Email) { $seedArgs += @("--email", $Email) }
    if ($DryRunSeed) { $seedArgs += "--dry-run" }
    if (-not $Email) {
      Write-Host "Seed requires -Email (or run seed-suspicious-action-logs.cjs --user-id manually)" -ForegroundColor Yellow
    } else {
      node @seedArgs
      if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
  }

  Write-Host "`nAdmin stats: GET $Base/users/admin/statistics?days=1&top=20" -ForegroundColor Green
} finally {
  Pop-Location
}
