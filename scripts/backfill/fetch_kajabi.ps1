<#
  scripts/backfill/fetch_kajabi.ps1

  Fetches all paginated data from a Kajabi public API endpoint and writes:
    - .cache/<entity>.json         : raw JSON array of all records
    - .cache/<entity>.meta.json    : metadata (count, page count, timing)

  Usage:
    pwsh ./fetch_kajabi.ps1 -Entity offers
    pwsh ./fetch_kajabi.ps1 -Entity purchases
    pwsh ./fetch_kajabi.ps1 -Entity transactions
    pwsh ./fetch_kajabi.ps1 -Entity contacts

  Credentials are read from environment variables:
    $env:KAJABI_CLIENT_ID
    $env:KAJABI_CLIENT_SECRET
#>

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('offers','purchases','transactions','contacts')]
  [string]$Entity,

  [int]$PageSize = 100
)

$ErrorActionPreference = 'Stop'

# --- Credentials ---
$clientId     = $env:KAJABI_CLIENT_ID
$clientSecret = $env:KAJABI_CLIENT_SECRET
if (-not $clientId -or -not $clientSecret) {
  Write-Error "Set KAJABI_CLIENT_ID and KAJABI_CLIENT_SECRET env vars before running."
  exit 1
}

# --- OAuth token ---
Write-Host "[1/3] Requesting OAuth token..."
$body = "grant_type=client_credentials&client_id=$clientId&client_secret=$clientSecret"
$tk = Invoke-RestMethod -Uri 'https://api.kajabi.com/v1/oauth/token' `
  -Method POST -Body $body -ContentType 'application/x-www-form-urlencoded'
$headers = @{
  'Authorization' = "Bearer $($tk.access_token)"
  'Accept'        = 'application/vnd.api+json'
}
Write-Host "      Token OK (expires in $($tk.expires_in)s)"

# --- Paginated fetch ---
Write-Host "[2/3] Paginating /v1/$Entity ..."
$all = @()
$page = 1
$startedAt = Get-Date

# /v1/transactions requires a filter[site_id]= parameter
$filterParam = ''
if ($Entity -eq 'transactions') {
  $siteId = $env:KAJABI_SITE_ID
  if (-not $siteId) {
    Write-Error "Set KAJABI_SITE_ID env var (required for /v1/transactions endpoint)."
    exit 1
  }
  $filterParam = "&filter%5Bsite_id%5D=$siteId"
  Write-Host "      Using site_id filter: $siteId"
}

do {
  $url = "https://api.kajabi.com/v1/$Entity" + "?page%5Bnumber%5D=$page&page%5Bsize%5D=$PageSize" + $filterParam
  $resp = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
  $batch = @($resp.data)
  $all += $batch
  Write-Host ("      page {0,3} : +{1,4} records (total: {2})" -f $page, $batch.Count, $all.Count)
  $hasNext = ($null -ne $resp.links.next) -and ($batch.Count -gt 0)
  $page++
} while ($hasNext)
$elapsed = (Get-Date) - $startedAt

# --- Save ---
$cacheDir = Join-Path $PSScriptRoot '..\..\.cache'
New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
$jsonPath = Join-Path $cacheDir "$Entity.json"
$metaPath = Join-Path $cacheDir "$Entity.meta.json"

Write-Host "[3/3] Saving..."
$all | ConvertTo-Json -Depth 20 -Compress | Out-File -Encoding utf8 -FilePath $jsonPath
@{
  entity         = $Entity
  records_count  = $all.Count
  pages_fetched  = $page - 1
  page_size      = $PageSize
  elapsed_sec    = [math]::Round($elapsed.TotalSeconds, 2)
  fetched_at_utc = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json | Out-File -Encoding utf8 -FilePath $metaPath

Write-Host ""
Write-Host "Done. $($all.Count) records written to $jsonPath in $([math]::Round($elapsed.TotalSeconds, 1))s."
