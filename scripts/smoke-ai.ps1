# Checks the assistant end to end against the running stack, with a throwaway fictional account that is deleted afterwards.
#   .\scripts\smoke-ai.ps1                 asks one public question and checks the model-written answer
#   .\scripts\smoke-ai.ps1 -Origin http://localhost:8080
#   .\scripts\smoke-ai.ps1 -Origin http://localhost:3100 -LogFile server.log   (an app run on the host: its log file is checked instead of Docker's)
# What it proves:
#   1. a general question is answered by the configured model (a `generated` block) from the passages the server found,
#      and every citation points at a passage that was supplied;
#   2. an emergency message is answered by the fixed safety path, with no model-written text;
#   3. the question text never appears in the backend's logs;
#   4. a message about the person's own symptoms is not sent for generation (it gets the deterministic reply).
# It sends one public question and one made-up emergency sentence to the model provider. Nothing about the person is sent.
param([string]$Origin = "http://localhost:8080", [string]$LogFile = "")
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

function Check([string]$text) { Write-Host "  ok  $text" -ForegroundColor Green }
function Fail([string]$text) { throw $text }

$health = Invoke-RestMethod "$Origin/api/health"
if ($health.status -ne "ok") { Fail "The backend is not healthy ($($health.status))." }
if (-not $health.ai -or $health.ai.provider -eq "catalog") {
  Write-Host "No model is configured (CHAT_PROVIDER is catalog), so there is nothing to smoke-test. Answers come from the reviewed passages." -ForegroundColor Yellow
  return
}
if (-not $health.ai.configured) { Fail "CHAT_PROVIDER is $($health.ai.provider) but the key or model is missing in .env.docker." }
Write-Host "Assistant provider: $($health.ai.provider), model: $($health.ai.model)"

$suffix = -join ((48..57) + (97..122) | Get-Random -Count 8 | ForEach-Object { [char]$_ })
$username = "smoke-$suffix"
$password = "fictional-smoke-" + $suffix
$headers = @{ Origin = $Origin }
$json = "application/json"
# A sentence that is easy to find in logs and carries nothing about a real person.
$marker = "zebra$suffix"
$question = "How does the FIT stool test used in bowel cancer screening work? ($marker)"

function Post($path, $body, $session) {
  Invoke-RestMethod "$Origin/api/$path" -Method Post -Headers $headers -ContentType $json -Body ($body | ConvertTo-Json -Depth 8) -WebSession $session
}

$session = $null
try {
  $null = Invoke-RestMethod "$Origin/api/account?view=identity" -Method Post -Headers $headers -ContentType $json `
    -Body (@{ action = "register"; username = $username; password = $password; language = "en" } | ConvertTo-Json) -SessionVariable session
  Check "registered a throwaway fictional account ($username)"

  $answer = Post "chat" @{ language = "en"; message = $question } $session
  $generated = $answer.generated
  if (-not $generated -or [string]::IsNullOrWhiteSpace($generated.text)) {
    Fail "The answer has no model-written text (kind '$($answer.kind)'). The server fell back to the reviewed passages, so the model call failed or was refused by the answer guard. Check: docker compose --env-file .env.docker logs backend --tail 50"
  }
  if ($generated.provider -ne $health.ai.provider) { Fail "The answer says provider '$($generated.provider)', expected '$($health.ai.provider)'." }
  $ids = @($answer.passages | ForEach-Object { $_.id })
  $cited = @($generated.citations)
  if ($cited.Count -lt 1) { Fail "The model-written answer cites no passage." }
  foreach ($id in $cited) { if ($ids -notcontains $id) { Fail "The answer cites '$id', which is not among the supplied passages ($($ids -join ', '))." } }
  Check "a general question is answered by $($generated.provider) ($($generated.model)), citing $($cited.Count) of the supplied passages"
  Write-Host "`n  Q: $question`n  A: $($generated.text)`n" -ForegroundColor DarkGray

  $links = @($answer.passages | ForEach-Object { $_.sources } | ForEach-Object { $_.url } | Where-Object { $_ } | Select-Object -Unique)
  if ($links.Count -lt 1 -or ($links | Where-Object { $_ -notmatch '^https://' })) { Fail "The answer must come with https source links." }
  Check "the answer comes with $($links.Count) https source link(s)"

  $alarm = Post "chat" @{ language = "en"; message = "I cannot breathe" } $session
  if ($alarm.kind -ne "emergency" -or $alarm.generated) { Fail "An emergency message must get the fixed safety answer without model-written text (kind '$($alarm.kind)')." }
  Check "an emergency message gets the fixed safety answer, with no model-written text"

  $own = Post "chat" @{ language = "en"; message = "Log my symptom" } $session
  if ($own.generated) { Fail "A message about the person's own symptoms must not be sent for generation (kind '$($own.kind)')." }
  Check "a message about the person's own symptoms is not sent to the model (kind '$($own.kind)')"

  # docker writes progress to stderr, which Windows PowerShell 5.1 turns into errors, so judge the text, not the stream.
  $previous = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    if ($LogFile) { $logs = (Get-Content -Raw -LiteralPath $LogFile) }
    else { $logs = (docker compose --env-file .env.docker logs backend --since 10m 2>&1 | ForEach-Object { "$_" }) -join "`n" }
  } finally { $ErrorActionPreference = $previous }
  if ($logs -match [regex]::Escape($marker) -or $logs -match "FIT stool test used") { Fail "The question text appears in the backend logs." }
  Check "the question text is not in the backend logs"
  Write-Host "`nThe assistant works end to end." -ForegroundColor Green
}
finally {
  if ($session) {
    try {
      $null = Invoke-RestMethod "$Origin/api/my-data" -Method Delete -Headers $headers -ContentType $json -WebSession $session `
        -Body (@{ confirm = $true; password = $password } | ConvertTo-Json)
      Write-Host "  ok  deleted the throwaway account" -ForegroundColor Green
    } catch { Write-Host "  warn could not delete $username. Delete it from Profile > Delete my account." -ForegroundColor Yellow }
  }
}
