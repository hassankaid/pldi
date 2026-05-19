<#
  scripts/backfill/generate_load_sql.ps1

  Reads .cache/<entity>.json (output of fetch_kajabi.ps1) and generates
  chunked SQL files .cache/<entity>_chunk_NNN.sql that perform an
  idempotent UPSERT into raw.kajabi_<entity>.

  The JSON payload is embedded inside each SQL via dollar-quoting
  ($KAJABI$ ... $KAJABI$), so any special character is preserved verbatim.
  Postgres expands the array via jsonb_array_elements server-side.

  Usage:
    .\generate_load_sql.ps1 -Entity offers
    .\generate_load_sql.ps1 -Entity offers -ChunkSize 50
#>

param(
  [Parameter(Mandatory)]
  [ValidateSet('offers','purchases','transactions','contacts')]
  [string]$Entity,

  [int]$ChunkSize = 50
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path "$PSScriptRoot\..\..").Path
$inputPath = Join-Path $repoRoot ".cache\$Entity.json"
if (-not (Test-Path $inputPath)) {
  Write-Error "Input file not found: $inputPath. Run fetch_kajabi.ps1 -Entity $Entity first."
  exit 1
}

# --- Per-entity transformation config ---
$selectExpr_offers = @'
  o->>'id',
  o->'attributes'->>'title',
  o->'attributes'->>'internal_title',
  o->'attributes'->>'description',
  o->'attributes'->>'currency',
  NULLIF(o->'attributes'->>'price_in_cents','')::bigint,
  o->'attributes'->>'payment_type',
  o->'attributes'->>'payment_method',
  o->'attributes'->>'price_description',
  (o->'attributes'->>'recurring_offer')::boolean,
  (o->'attributes'->>'subscription')::boolean,
  (o->'attributes'->>'one_time')::boolean,
  (o->'attributes'->>'single')::boolean,
  (o->'attributes'->>'free')::boolean,
  o->'attributes'->>'token',
  o->'attributes'->>'checkout_url',
  o->'attributes'->>'image_url',
  o->'relationships'->'site'->'data'->>'id',
  COALESCE(ARRAY(SELECT jsonb_array_elements(o->'relationships'->'products'->'data')->>'id'), ARRAY[]::text[]),
  o
'@

$config = @{
  offers = @{
    table   = 'raw.kajabi_offers'
    columns = 'kajabi_id, title, internal_title, description, currency, price_in_cents, payment_type, payment_method, price_description, recurring_offer, subscription, one_time, single, free, token, checkout_url, image_url, site_id, product_ids, payload'
    select  = $selectExpr_offers
    update  = 'title=EXCLUDED.title, internal_title=EXCLUDED.internal_title, description=EXCLUDED.description, currency=EXCLUDED.currency, price_in_cents=EXCLUDED.price_in_cents, payment_type=EXCLUDED.payment_type, payment_method=EXCLUDED.payment_method, price_description=EXCLUDED.price_description, recurring_offer=EXCLUDED.recurring_offer, subscription=EXCLUDED.subscription, one_time=EXCLUDED.one_time, single=EXCLUDED.single, free=EXCLUDED.free, token=EXCLUDED.token, checkout_url=EXCLUDED.checkout_url, image_url=EXCLUDED.image_url, site_id=EXCLUDED.site_id, product_ids=EXCLUDED.product_ids, payload=EXCLUDED.payload, synced_at=now()'
  }
}

if (-not $config.ContainsKey($Entity)) {
  Write-Error "Entity '$Entity' is not yet configured in this script."
  exit 1
}
$cfg = $config[$Entity]

# --- Load and chunk ---
$records = Get-Content $inputPath -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Loaded $($records.Count) records from $inputPath"

$chunks = New-Object System.Collections.ArrayList
for ($i = 0; $i -lt $records.Count; $i += $ChunkSize) {
  $end = [Math]::Min($i + $ChunkSize - 1, $records.Count - 1)
  [void]$chunks.Add(@($records[$i..$end]))
}
Write-Host "Splitting into $($chunks.Count) chunk(s) of up to $ChunkSize records"

# Remove any previous chunks for this entity
$cacheDir = Join-Path $repoRoot ".cache"
Get-ChildItem -Path $cacheDir -Filter "$Entity`_chunk_*.sql" -ErrorAction SilentlyContinue | Remove-Item -Force

# --- Emit one SQL file per chunk ---
for ($n = 0; $n -lt $chunks.Count; $n++) {
  $chunkRecords = $chunks[$n]
  $chunkJson = $chunkRecords | ConvertTo-Json -Depth 20
  if ($chunkRecords.Count -eq 1) {
    # ConvertTo-Json doesn't wrap single objects in array; force it
    $chunkJson = "[$chunkJson]"
  }

  $sql = @"
-- Chunk $($n+1) of $($chunks.Count) for $Entity ($($chunkRecords.Count) records)
INSERT INTO $($cfg.table) ($($cfg.columns))
SELECT
$($cfg.select)
FROM jsonb_array_elements(`$KAJABI`$
$chunkJson
`$KAJABI`$::jsonb) o
ON CONFLICT (kajabi_id) DO UPDATE SET
  $($cfg.update);
"@

  $fileName = "{0}_chunk_{1:D3}.sql" -f $Entity, ($n + 1)
  $outFile = Join-Path $cacheDir $fileName
  $sql | Out-File -Encoding utf8 -FilePath $outFile
  $sizeKB = [Math]::Round((Get-Item $outFile).Length / 1KB, 1)
  Write-Host ("  chunk {0:D3}: {1,3} records, {2,6} KB" -f ($n + 1), $chunkRecords.Count, $sizeKB)
}

Write-Host ""
Write-Host "Done. $($chunks.Count) SQL chunk file(s) generated in .cache/"
