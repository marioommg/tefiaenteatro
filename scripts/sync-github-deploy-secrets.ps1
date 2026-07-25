#Requires -Version 5.1
<#
.SYNOPSIS
  Copia secrets/variables de deploy desde .env a GitHub Actions (sin imprimir valores).
#>
param(
  [string]$Repo = "marioommg/tefiaenteatro",
  [string]$EnvFile = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not $EnvFile) { $EnvFile = Join-Path $Root ".env" }
if (-not (Test-Path $EnvFile)) { throw "No existe $EnvFile" }

$map = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $name, $value = $_.Split('=', 2)
  $map[$name.Trim()] = $value.Trim().Trim('"').Trim("'")
}

$secrets = @(
  "CLOUDFLARE_API_TOKEN",
  "PUBLIC_REVISION_API_URL",
  "PUBLIC_PHOTO_REPORT_AUTH",
  "PUBLIC_VIP_VIDEO_6_JULIO_ID"
)
$variables = @(
  "CLOUDFLARE_ZONE_IDS"
)

foreach ($key in ($secrets + $variables)) {
  if (-not $map.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($map[$key]) -or $map[$key] -like '<*') {
    throw "Falta o es placeholder en .env: $key"
  }
}

foreach ($key in $secrets) {
  $map[$key] | gh secret set $key --repo $Repo
  if ($LASTEXITCODE -ne 0) { throw "gh secret set $key falló" }
  Write-Host "OK secret $key"
}

foreach ($key in $variables) {
  gh variable set $key --repo $Repo --body $map[$key]
  if ($LASTEXITCODE -ne 0) { throw "gh variable set $key falló" }
  Write-Host "OK variable $key"
}

Write-Host "`nSecrets/variables sincronizados en $Repo (valores no mostrados).`n"
