# Builds and starts a SECOND, separate copy of the whole care4all stack for previews, next to the production one.
#   .\scripts\deploy-preview.ps1          build the working tree and (re)start the preview stack
#   .\scripts\deploy-preview.ps1 -Fresh   rebuild every image of the preview without the build cache
# It never touches the production stack (compose project "care4all", containers care4all-db-1, care4all-backend-1 and
# care4all-frontend-1, ports 8080, 3000 and 5432). The preview has its own compose project name, containers, images, network,
# database volume and ports, and its own settings file .env.docker.preview (git-ignored, made on the first run). Every docker
# command below names the preview project explicitly. Only the preview's own containers are ever created, replaced or removed.
param(
  [string]$Project = "care4all-preview",
  [int]$FrontendPort = 8081,
  [int]$BackendPort = 3001,
  [int]$DatabasePort = 5433,
  [switch]$Fresh
)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

function Step([string]$text) { Write-Host "`n==> $text" -ForegroundColor Cyan }
function Check([string]$text) { Write-Host "  ok  $text" -ForegroundColor Green }
function Run([string]$what, [scriptblock]$command) {
  # docker reports progress on stderr. Windows PowerShell 5.1 turns native stderr into errors whenever the host captures it,
  # so merge it into plain text here and judge success by the exit code instead.
  $previous = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try { & $command 2>&1 | ForEach-Object { "$_" } | Out-Host } finally { $ErrorActionPreference = $previous }
  if ($LASTEXITCODE -ne 0) { throw "$what failed (exit code $LASTEXITCODE)" }
}
function Read-Settings([string]$file) {
  $found = @{}
  foreach ($line in Get-Content $file) { if ($line -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { $found[$Matches[1]] = $Matches[2].Trim() } }
  return $found
}
# Production state, read only: the container ids and start times. It is compared again at the end.
$production = @("care4all-db-1", "care4all-backend-1", "care4all-frontend-1")
function Production-State {
  return ($production | ForEach-Object { $s = (docker inspect -f "{{.Id}} {{.State.StartedAt}} {{.Image}}" $_ 2>$null); "$_ $s" }) -join "`n"
}

docker version --format "{{.Server.Version}}" *> $null
if ($LASTEXITCODE -ne 0) { throw "Docker is not running. Start Docker Desktop (Linux containers) and try again." }

# ---- guards: this script must never be able to reach production
if ($Project -eq "care4all") { throw "The project name 'care4all' is the production stack. Use another name for a preview." }
$prod = if (Test-Path ".env.docker") { Read-Settings ".env.docker" } else { @{} }
$prodPorts = @{
  "frontend" = $(if ($prod["FRONTEND_PORT"]) { [int]$prod["FRONTEND_PORT"] } else { 8080 })
  "backend" = $(if ($prod["APP_PORT"]) { [int]$prod["APP_PORT"] } else { 3000 })
  "database" = $(if ($prod["POSTGRES_PORT"]) { [int]$prod["POSTGRES_PORT"] } else { 5432 })
}
if ($FrontendPort -eq $prodPorts["frontend"] -or $BackendPort -eq $prodPorts["backend"] -or $DatabasePort -eq $prodPorts["database"]) {
  throw "A preview port equals a production port (production uses $($prodPorts["frontend"]), $($prodPorts["backend"]) and $($prodPorts["database"]))."
}

# ---- the preview's own settings file
$envFile = ".env.docker.preview"
if (-not (Test-Path $envFile)) {
  Step "Creating $envFile (git-ignored): its own database password and ports, the same model settings as production"
  $password = ""
  while ($password.Length -lt 24) {
    $bytes = New-Object byte[] 24
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $password = ([Convert]::ToBase64String($bytes) -replace "[^A-Za-z0-9]", "")
  }
  $password = $password.Substring(0, 24)
  $lines = @(
    "# Preview stack (project $Project). Made by scripts/deploy-preview.ps1. Not production. Never commit this file.",
    "POSTGRES_PASSWORD=$password",
    "DOCKER_DATABASE_URL=postgresql://care4all:$password@db:5432/care4all",
    "POSTGRES_PORT=$DatabasePort",
    "APP_PORT=$BackendPort",
    "FRONTEND_PORT=$FrontendPort",
    "# Every address the preview is opened at. A public https address (a tunnel) goes here too, then run this script again.",
    "APP_ORIGIN=http://localhost:$FrontendPort",
    "COOKIE_SECURE=false"
  )
  foreach ($key in "AI_PROVIDER", "CHAT_PROVIDER", "GEMINI_API_KEY", "GEMINI_MODEL", "VERDA_BASE_URL", "VERDA_API_KEY", "VERDA_MODEL", "AI_RATE_LIMIT", "INTERVIEW_RATE_LIMIT", "RISK_RATE_LIMIT") {
    if ($prod.ContainsKey($key)) { $lines += "$key=$($prod[$key])" }
  }
  [IO.File]::WriteAllText((Join-Path (Get-Location) $envFile), (($lines -join "`n") + "`n"), (New-Object Text.UTF8Encoding($false)))
  Check "$envFile written (values are not printed)"
}
$settings = Read-Settings $envFile
$frontendPort = [int]$settings["FRONTEND_PORT"]
$appPort = [int]$settings["APP_PORT"]
$origin = "http://localhost:$frontendPort"
$configured = @(([string]$settings["APP_ORIGIN"] -split ",") | ForEach-Object { $_.Trim().TrimEnd("/") } | Where-Object { $_ })
if ($configured -notcontains $origin) { throw "APP_ORIGIN in $envFile is '$($settings["APP_ORIGIN"])' but the preview is opened at $origin. List $origin in it." }

$before = Production-State
Step "Production stack (read only, must not change): $(($production | ForEach-Object { $_ }) -join ', ')"
Write-Host ($before -split "`n" | ForEach-Object { "  " + ($_ -replace "(sha256:)?([0-9a-f]{12})[0-9a-f]+", '$2') }) -Separator "`n"

$compose = @("compose", "-p", $Project, "--env-file", $envFile)
Step "Building the preview images (project $Project)"
$build = $compose + @("build")
if ($Fresh) { $build += "--no-cache" }
Run "Build" { docker @build }

Step "Starting the preview: database, migration, backend and PWA (its own database volume is kept between runs)"
$up = $compose + @("up", "-d", "--wait", "--remove-orphans")
Run "Start" { docker @up }

Step "Verifying the preview"
$direct = Invoke-RestMethod "http://localhost:$appPort/api/health"
if ($direct.status -ne "ok") { throw "Preview backend health check says '$($direct.status)'." }
Check "preview backend $($direct.version) answers at http://localhost:$appPort"
$proxied = Invoke-RestMethod "$origin/api/health"
if ($proxied.status -ne "ok" -or $proxied.version -ne $direct.version) { throw "The preview PWA container does not reach its backend." }
Check "the preview PWA reaches its backend and database through $origin/api"
if (-not $direct.content) { throw "The preview backend reports no content version, so its database was not seeded (check the migrate service logs of the project $Project)." }
$served = Invoke-WebRequest "$origin/api/content" -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json
if ($served.version -ne $direct.content -or @($served.content.TOPIC_ORDER).Count -lt 1) { throw "$origin/api/content did not return the seeded content." }
Check "the preview database is seeded (content version $($served.version))"
$shell = Invoke-WebRequest "$origin/" -UseBasicParsing
if ($shell.StatusCode -ne 200) { throw "The preview PWA shell did not answer." }
Check "the preview PWA shell is served"

$after = Production-State
if ($before -ne $after) { throw "The production containers changed while the preview was deployed. Look at docker ps before anything else." }
Check "the production containers are exactly as they were (same ids, same start times)"

Write-Host "`nPreview deployed. Open $origin   (production is untouched)" -ForegroundColor Green
Write-Host "Preview backend for direct checks: http://localhost:$appPort    Stop only the preview with: docker compose -p $Project --env-file $envFile down   (the preview's database volume is kept)"
