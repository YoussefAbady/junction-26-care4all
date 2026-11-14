# Builds and starts the whole care4all stack on Docker Desktop, then checks every hop.
#   .\scripts\deploy-local.ps1          build and start
#   .\scripts\deploy-local.ps1 -Fresh   rebuild every image without the build cache
# The database volume is always kept. Nothing here deletes data.
param([switch]$Fresh)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

function Step([string]$text) { Write-Host "`n==> $text" -ForegroundColor Cyan }
function Check([string]$text) { Write-Host "  ok  $text" -ForegroundColor Green }
function Run([string]$what, [scriptblock]$command) {
  # docker reports progress on stderr. Windows PowerShell 5.1 turns native stderr into errors whenever the host
  # captures it, so merge it into plain text here and judge success by the exit code instead.
  $previous = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try { & $command 2>&1 | ForEach-Object { "$_" } | Out-Host } finally { $ErrorActionPreference = $previous }
  if ($LASTEXITCODE -ne 0) { throw "$what failed (exit code $LASTEXITCODE)" }
}
function Status([scriptblock]$request) {
  try { return [int](& $request).StatusCode } catch { return [int]$_.Exception.Response.StatusCode }
}

docker version --format "{{.Server.Version}}" *> $null
if ($LASTEXITCODE -ne 0) { throw "Docker is not running. Start Docker Desktop (Linux containers) and try again." }
if (-not (Test-Path ".env.docker")) { throw ".env.docker is missing. Copy .env.docker.example to .env.docker and set the database password first." }

$settings = @{}
foreach ($line in Get-Content ".env.docker") { if ($line -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { $settings[$Matches[1]] = $Matches[2].Trim() } }
$frontendPort = if ($settings["FRONTEND_PORT"]) { $settings["FRONTEND_PORT"] } else { "8080" }
$appPort = if ($settings["APP_PORT"]) { $settings["APP_PORT"] } else { "3000" }
$origin = "http://localhost:$frontendPort"
$app = "http://localhost:$appPort"
# APP_ORIGIN may list several origins separated by commas. A localhost origin also stands for 127.0.0.1 and [::1] on the same port.
$configured = @(([string]$settings["APP_ORIGIN"] -split ",") | ForEach-Object { $_.Trim().TrimEnd("/") } | Where-Object { $_ })
if ($configured.Count -gt 0 -and $configured -notcontains $origin) {
  throw "APP_ORIGIN is '$($settings["APP_ORIGIN"])' but the PWA is served at $origin. The backend rejects writes from any other origin, so list $origin in APP_ORIGIN in .env.docker."
}

Step "Building images"
$build = @("compose", "--env-file", ".env.docker", "build")
if ($Fresh) { $build += "--no-cache" }
Run "Build" { docker @build }

Step "Starting database, migration, backend and PWA (the database volume is kept)"
Run "Start" { docker compose --env-file .env.docker up -d --wait --remove-orphans }

Step "Verifying"
$direct = Invoke-RestMethod "$app/api/health"
if ($direct.status -ne "ok") { throw "Backend health check says '$($direct.status)'." }
Check "backend $($direct.version) answers at $app"

$proxied = Invoke-RestMethod "$origin/api/health"
if ($proxied.status -ne "ok" -or $proxied.version -ne $direct.version) { throw "The PWA container does not reach the backend." }
Check "the PWA container reaches the backend and the database through $origin/api"

if (-not $direct.content) { throw "The backend reports no content version, so the database content was not seeded (check the migrate service logs)." }
$served = Invoke-WebRequest "$origin/api/content" -UseBasicParsing
$payload = $served.Content | ConvertFrom-Json
$topics = @($payload.content.TOPIC_ORDER).Count
if ($payload.version -ne $direct.content -or $topics -lt 1) { throw "$origin/api/content did not return the seeded content (version '$($payload.version)', $topics topics)." }
Check "the database serves $topics topics, $(@($payload.content.ARTICLES.PSObject.Properties).Count) articles and $(@($payload.content.SOURCES.PSObject.Properties).Count) sources through $origin/api/content (version $($payload.version.Substring(0, [Math]::Min(12, $payload.version.Length))))"
$etag = $served.Headers["ETag"]
if ($etag -and (Status { Invoke-WebRequest "$origin/api/content" -Headers @{ "If-None-Match" = $etag } -UseBasicParsing }) -ne 304) { throw "$origin/api/content ignored If-None-Match." }
Check "the content is cacheable: an unchanged copy answers 304"

$ai = $direct.ai
if ($ai.provider -eq "catalog") {
  Write-Host "  note assistant answers come from the reviewed passages only (CHAT_PROVIDER is not gemini, so no model is called)" -ForegroundColor Yellow
} elseif ($ai.configured) {
  Check "assistant answers are written by $($ai.provider) ($($ai.model)) from the reviewed passages, and fall back to them if the model fails"
} else {
  Write-Host "  warn CHAT_PROVIDER is $($ai.provider) but it is not fully configured (key or model missing), so answers fall back to the reviewed passages" -ForegroundColor Yellow
}

$page = Invoke-WebRequest "$origin/" -UseBasicParsing
if ($page.Content -notmatch "care4all" -or -not $page.Headers["Content-Security-Policy"]) { throw "$origin did not serve the care4all app with its security headers." }
Check "the PWA shell is served with its security headers"

foreach ($path in "/manifest.webmanifest", "/sw.js", "/icons/icon-512.png") {
  if ((Status { Invoke-WebRequest "$origin$path" -UseBasicParsing }) -ne 200) { throw "$path is not served." }
}
Check "manifest, service worker and icons are served"

$foreign = Status { Invoke-WebRequest "$origin/api/account" -Method Post -Headers @{ Origin = "http://example.invalid" } -ContentType "application/json" -Body "{}" -UseBasicParsing }
if ($foreign -ne 403) { throw "A write from another origin was not rejected (HTTP $foreign)." }
Check "writes from another origin are rejected"

# People type 127.0.0.1 as often as localhost. It is the same app, so a sign-up there must work, not fail with a 403.
$alias = "http://127.0.0.1:$frontendPort"
$accepted = Status { Invoke-WebRequest "$origin/api/account" -Method Post -Headers @{ Origin = $alias } -ContentType "application/json" -Body "{}" -UseBasicParsing }
if ($accepted -eq 403) { throw "A write from $alias was rejected (HTTP 403), so signing up there would fail. Check APP_ORIGIN in .env.docker." }
Check "the same app opened at $alias is accepted too"

Write-Host "`nDeployed. Open $origin (http://127.0.0.1:$frontendPort works too)" -ForegroundColor Green
Write-Host "Backend API for direct checks: $app    Stop with: docker compose --env-file .env.docker down (the database volume is kept)"
