
param(
    [string]$Arg1,
    [string]$Arg2
)

# Forzar a PowerShell a usar UTF-8 para evitar caracteres extraños como Â
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 1. Configuracion de certificados y entorno
$certPath = python -m certifi
$env:AWS_CA_BUNDLE = $certPath
$env:AWS_PAGER = ""

# 2. Variables de S3/CloudFront
$bucket = 'tefiaenteatro.com'
$distributionId = 'E29CMKJWGWAZ58'
$distPath = Join-Path $PSScriptRoot 'dist'

Write-Host "--- PANEL DE CONTROL DE DESPLIEGUE ---" -ForegroundColor Yellow

# --- Logica de BUILD ---
$doBuild = $null
if ($Arg1 -eq '--build' -or $Arg2 -eq '--build') { $doBuild = $true }
elseif ($Arg1 -eq '--nobuild' -or $Arg2 -eq '--nobuild') { $doBuild = $false }

if ($null -eq $doBuild) {
    $ans = Read-Host "Quieres ejecutar el build (npm run build)? (s/n)"
    $doBuild = ($ans -eq 's')
}

if ($doBuild) {
    Write-Host "Ejecutando npm run build..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { 
        Write-Error "Error en el build. Abortando."
        exit $LASTEXITCODE 
    }
}
else {
    Write-Host "Saltando build..." -ForegroundColor Gray
}

# --- Logica de MEDIA ---
$includeMedia = $null
if ($Arg1 -eq '--s' -or $Arg2 -eq '--s') { $includeMedia = 's' }
elseif ($Arg1 -eq '--n' -or $Arg2 -eq '--n') { $includeMedia = 'n' }

if ($null -eq $includeMedia) {
    $includeMedia = Read-Host "Quieres subir imagenes y videos? (s/n)"
}

# --- Sincronizacion S3 ---
Write-Host "Sincronizando con S3 (media: $includeMedia)..." -ForegroundColor Cyan
if ($includeMedia -eq 's') {
    aws s3 sync $distPath s3://$bucket --delete
}
else {
    $excludeList = @('*.jpg', '*.jpeg', '*.png', '*.webp', '*.gif', '*.mp4', '*.mov', '*.avi', '*.mkv', '*.heic', '*.svg', '*.webm', '*.ogg', '*.avif')
    $excludeArgs = $excludeList | ForEach-Object { "--exclude", $_ }
    aws s3 sync $distPath s3://$bucket $excludeArgs --delete
}

# --- CloudFront ---
Write-Host "Invalidando cache de CloudFront..." -ForegroundColor Cyan
aws cloudfront create-invalidation --distribution-id $distributionId --paths '/*'

Write-Host "PROCESO TERMINADO CON EXITO" -ForegroundColor Green