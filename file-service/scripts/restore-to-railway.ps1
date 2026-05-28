param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,

  [Parameter(Mandatory = $true)]
  [string]$RemoteUrl
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
  throw "Backup file not found: $BackupFile"
}

Write-Host "Restoring $BackupFile to remote Postgres..."

Get-Content $BackupFile -Raw | docker run -i --rm postgres:16-alpine psql $RemoteUrl

Write-Host "Restore finished."
