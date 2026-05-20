##############################################################
#  generate-suspicious-traffic.ps1
#
#  Generates suspicious activity for a given user token so
#  that admin/statistics endpoint shows triggered signals.
#
#  Usage:
#    .\generate-suspicious-traffic.ps1 -Token "<JWT>"
#    .\generate-suspicious-traffic.ps1 -Token "<JWT>" -Base "http://localhost:3000"
#    .\generate-suspicious-traffic.ps1 -Token "<JWT>" -Phases auth,burst,agents,paths,forbidden
##############################################################

param(
  [Parameter(Mandatory = $true)]
  [string]$Token,

  [string]$Base = "http://localhost:3000",

  # Comma-separated list of phases to run. Default: all.
  # Available: auth, agents, paths, forbidden, burst
  [string]$Phases = "auth,agents,paths,forbidden,burst"
)

$run = $Phases -split "," | ForEach-Object { $_.Trim().ToLower() }

function Req {
  param([string]$Method = "GET", [string]$Path, [string]$Body = "", [string]$Agent = "", [string]$AuthHeader = "Bearer $Token")
  $args = @("-s", "-o", "NUL", "-w", "%{http_code}", "-X", $Method, "-H", "Authorization: $AuthHeader")
  if ($Agent)       { $args += @("-H", "User-Agent: $Agent") }
  if ($Body)        { $args += @("-H", "Content-Type: application/json", "-d", $Body) }
  $args += "$Base$Path"
  return (curl.exe @args 2>$null)
}

# ── Phase 1: Auth errors ──────────────────────────────────────────────────────
# 15 requests with garbage tokens → 15× 401
# Triggers: auth_errors  (rate > 5%, count >= 10)
if ($run -contains "auth") {
  Write-Host "`n=== PHASE: auth errors (15 invalid tokens) ===" -ForegroundColor Yellow
  1..15 | ForEach-Object {
    $code = Req -Path "/storage" -AuthHeader "Bearer INVALID_TOKEN_$_"
    Write-Host "  req $_ -> $code"
  }
}

# ── Phase 2: Agent rotation ───────────────────────────────────────────────────
# 5 requests each with a different User-Agent header
# Triggers: agent_rotation  (uniqueAgents > 3)
if ($run -contains "agents") {
  Write-Host "`n=== PHASE: agent rotation (5 User-Agents) ===" -ForegroundColor Yellow
  $agents = @(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "python-requests/2.28.0",
    "curl/7.88.1",
    "Go-http-client/1.1",
    "Scrapy/2.8.0 (+https://scrapy.org)"
  )
  foreach ($agent in $agents) {
    $code = Req -Path "/storage" -Agent $agent
    Write-Host "  [$agent] -> $code"
  }
}

# ── Phase 3: Path enumeration ─────────────────────────────────────────────────
# Hits 13 distinct endpoints in sequence
# Triggers: path_enumeration  (density > 0.5, uniquePaths > 10)
if ($run -contains "paths") {
  Write-Host "`n=== PHASE: path enumeration (13 unique endpoints) ===" -ForegroundColor Yellow
  $endpoints = @(
    @{M="GET";  P="/storage"},
    @{M="GET";  P="/users/1"},
    @{M="GET";  P="/users/2"},
    @{M="GET";  P="/users/3"},
    @{M="POST"; P="/storage/structure";    B='{"storageId":"00000000-0000-0000-0000-000000000001"}'},
    @{M="POST"; P="/storage/trash";        B='{"storageId":"00000000-0000-0000-0000-000000000001"}'},
    @{M="POST"; P="/storage/delete-item";  B='{}'},
    @{M="POST"; P="/storage/move-item";    B='{}'},
    @{M="POST"; P="/storage/rename-item";  B='{}'},
    @{M="POST"; P="/storage/copy-item";    B='{}'},
    @{M="POST"; P="/storage/restore-item"; B='{}'},
    @{M="POST"; P="/storage/create-item";  B='{}'},
    @{M="POST"; P="/storage/full-tree";    B='{}'}
  )
  foreach ($ep in $endpoints) {
    $body = if ($ep.B) { $ep.B } else { "" }
    $code = Req -Method $ep.M -Path $ep.P -Body $body
    Write-Host "  $($ep.M) $($ep.P) -> $code"
  }
}

# ── Phase 4: Forbidden probing ────────────────────────────────────────────────
# Access admin endpoints and other users' resources
# Triggers: forbidden_probing  (rate > 5%, count >= 5)
if ($run -contains "forbidden") {
  Write-Host "`n=== PHASE: forbidden probing (admin + alien resources) ===" -ForegroundColor Yellow
  $targets = @(
    @{M="GET";  P="/users/admin/statistics"},
    @{M="GET";  P="/users/admin/list"},
    @{M="POST"; P="/storage/structure"; B='{"storageId":"ffffffff-ffff-ffff-ffff-ffffffffffff"}'},
    @{M="POST"; P="/storage/structure"; B='{"storageId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}'},
    @{M="POST"; P="/storage/structure"; B='{"storageId":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}'},
    @{M="POST"; P="/storage/structure"; B='{"storageId":"cccccccc-cccc-cccc-cccc-cccccccccccc"}'}
  )
  foreach ($ep in $targets) {
    $body = if ($ep.B) { $ep.B } else { "" }
    $code = Req -Method $ep.M -Path $ep.P -Body $body
    Write-Host "  $($ep.M) $($ep.P) -> $code"
  }
}

# ── Phase 5: Request burst ────────────────────────────────────────────────────
# 40 parallel requests → ~170 req/min in the burst window
# Triggers: request_burst  (peakPerMinute > 30)
if ($run -contains "burst") {
  Write-Host "`n=== PHASE: request burst (40 parallel) ===" -ForegroundColor Yellow
  $start = Get-Date
  $jobs = 1..40 | ForEach-Object {
    Start-Job -ScriptBlock {
      param($base, $token)
      curl.exe -s -o NUL -w "%{http_code}" -H "Authorization: Bearer $token" "$base/storage" 2>$null
    } -ArgumentList $Base, $Token
  }
  $results = $jobs | Wait-Job | Receive-Job
  $jobs | Remove-Job
  $elapsed = [math]::Round(((Get-Date) - $start).TotalSeconds, 2)
  $groups  = $results | Group-Object | Select-Object Name, Count
  Write-Host "  40 requests completed in ${elapsed}s"
  $groups | ForEach-Object { Write-Host "  HTTP $($_.Name): $($_.Count) requests" }
}

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host "`n=== Done. Check admin statistics: ===" -ForegroundColor Green
Write-Host "  GET $Base/users/admin/statistics?days=1&top=20"
Write-Host "  (use an admin JWT in Authorization header)`n"
