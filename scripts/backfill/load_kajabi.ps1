<#
  scripts/backfill/load_kajabi.ps1

  Loads cached JSON data (.cache/<entity>.json) into Supabase by calling
  the RPC function public.upsert_kajabi_<entity>(jsonb) via the REST API.

  Reads credentials from .env at repo root.

  Usage:
    .\load_kajabi.ps1 -Entity offers
    .\load_kajabi.ps1 -Entity offers -ChunkSize 1000
#>

param(
  [Parameter(Mandatory)]
  [ValidateSet('offers','purchases','transactions','contacts')]
  [string]$Entity,

  [int]$ChunkSize = 1000
)

$ErrorActionPreference = 'Stop'

# --- Locate repo root ---
$repoRoot = (Resolve-Path "$PSScriptRoot\..\..").Path
$envPath  = Join-Path $repoRoot ".env"
$jsonPath = Join-Path $repoRoot ".cache\$Entity.json"

# --- Load .env ---
if (-not (Test-Path $envPath)) {
  Write-Error "Missing .env at $envPath."
  exit 1
}
$envVars = @{}
foreach ($line in (Get-Content $envPath)) {
  if ($line -match '^\s*#') { continue }
  if ($line -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$') {
    $envVars[$Matches[1]] = $Matches[2]
  }
}
$supabaseUrl = $envVars['SUPABASE_URL']
$serviceKey  = $envVars['SUPABASE_SERVICE_ROLE_KEY']
if (-not $supabaseUrl -or -not $serviceKey) {
  Write-Error "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
  exit 1
}

# --- Load JSON data ---
if (-not (Test-Path $jsonPath)) {
  Write-Error "Missing $jsonPath. Run fetch_kajabi.ps1 -Entity $Entity first."
  exit 1
}
$records = Get-Content $jsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
$total = $records.Count
Write-Host "Loaded $total records from $jsonPath"

# --- Prep RPC call ---
$rpcUrl = "$supabaseUrl/rest/v1/rpc/upsert_kajabi_$Entity"
$headers = @{
  'apikey'        = $serviceKey
  'Authorization' = "Bearer $serviceKey"
  'Content-Type'  = 'application/json'
}

# --- Chunk and POST ---
$totalUpserted = 0
$startedAt = Get-Date
$totalChunks = [Math]::Ceiling($total / $ChunkSize)

for ($i = 0; $i -lt $total; $i += $ChunkSize) {
  $end = [Math]::Min($i + $ChunkSize - 1, $total - 1)
  $chunk = @($records[$i..$end])
  $body = @{ data = $chunk } | ConvertTo-Json -Depth 20 -Compress

  $chunkN = [Math]::Floor($i / $ChunkSize) + 1
  Write-Host ("  POST chunk {0}/{1} ({2,4} records, {3,6} KB body)..." -f $chunkN, $totalChunks, $chunk.Count, [Math]::Round($body.Length / 1KB, 1))

  # PS 5.1 Invoke-RestMethod -Body <string> sends as UTF-16, which PostgREST rejects.
  # Convert to UTF-8 bytes explicitly.
  $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)

  try {
    $resp = Invoke-RestMethod -Uri $rpcUrl -Method POST -Headers $headers -Body $bodyBytes -ContentType 'application/json; charset=utf-8'
    $totalUpserted += $resp
    Write-Host ("      -> {0} rows upserted (running total: {1})" -f $resp, $totalUpserted)
  } catch {
    Write-Host ("      -> ERROR: " + $_.Exception.Message)
    if ($_.Exception.Response) {
      try {
        $s = $_.Exception.Response.GetResponseStream()
        $r = New-Object IO.StreamReader($s)
        $r.BaseStream.Position = 0
        Write-Host ("      Body: " + $r.ReadToEnd())
      } catch {}
    }
    exit 1
  }
}

$elapsed = (Get-Date) - $startedAt
Write-Host ""
Write-Host ("Done. {0} rows upserted into raw.kajabi_{1} in {2}s." -f $totalUpserted, $Entity, [Math]::Round($elapsed.TotalSeconds, 1))
