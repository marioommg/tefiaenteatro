param(
  [string]$Arg1,
  [string]$Arg2,
  [switch]$Yes,        # Omite la confirmacion de --delete (para CI/CD)
  [switch]$DryRun,     # Muestra cambios planeados sin ejecutarlos (aws s3 sync --dryrun)
  [string]$Profile     # Perfil AWS explicito (si no, usa el perfil por defecto)
)

# Forzar a PowerShell a usar UTF-8 para evitar caracteres extraños como Â
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 1. Configuracion de certificados y entorno
$env:AWS_PAGER = ""

# 2. Variables de S3/CloudFront
$bucket = 'tefiaenteatro.com'
$distributionId = 'E29CMKJWGWAZ58'
$distPath = Join-Path $PSScriptRoot 'dist'

# Perfil AWS: si se pasa -Profile, usarlo; sino, usar el perfil por defecto
$awsProfileArgs = if ($Profile) { @('--profile', $Profile) } else { @() }

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
$mediaOption = $null
if ($Arg1 -eq '--media-all' -or $Arg2 -eq '--media-all') { $mediaOption = 't' }
elseif ($Arg1 -eq '--media-new' -or $Arg2 -eq '--media-new') { $mediaOption = 'n' }
elseif ($Arg1 -eq '--media-none' -or $Arg2 -eq '--media-none') { $mediaOption = 'x' }

if ($null -eq $mediaOption) {
  Write-Host "Opciones de archivos multimedia (imagenes/videos):" -ForegroundColor Cyan
  Write-Host " [t] Subir todas desde cero"
  Write-Host " [n] Subir solo las nuevas o modificadas"
  Write-Host " [x] No subir"
  $mediaOption = Read-Host "Elige una opcion (t/n/x)"
}

# --- Verificacion de seguridad de dist/ ---
function Test-DistSafety {
  if (-not (Test-Path $distPath)) {
    Write-Error "ERROR: No se encontro el directorio dist/. Ejecuta el build primero."
    exit 1
  }
  $fileCount = (Get-ChildItem -Path $distPath -Recurse -File | Measure-Object).Count
  if ($fileCount -eq 0) {
    Write-Error "ERROR: El directorio dist/ esta vacio. El build puede haber fallado."
    exit 1
  }
  if (-not (Test-Path (Join-Path $distPath 'index.html'))) {
    Write-Error "ERROR: No se encontro dist/index.html. El build puede estar incompleto."
    exit 1
  }
  Write-Host "dist/ contiene $fileCount archivos." -ForegroundColor Gray
  return $fileCount
}

# --- Confirmacion de --delete (salvo -Yes o -DryRun) ---
$fileCount = Test-DistSafety

if (-not $DryRun -and -not $Yes) {
  Write-Host ""
  Write-Host "ADVERTENCIA: --delete eliminara del bucket S3 cualquier archivo" -ForegroundColor Yellow
  Write-Host "que no exista en dist/ local ($fileCount archivos detectados)." -ForegroundColor Yellow
  $confirm = Read-Host "Escribe 'si' para continuar"
  if ($confirm -ne 'si') {
    Write-Host "Despliegue cancelado." -ForegroundColor Red
    exit 0
  }
}

if ($DryRun) {
  Write-Host ""
  Write-Host "MODO DRY-RUN: Solo se mostraran los cambios, sin ejecutarlos." -ForegroundColor Cyan
}

# --- Sincronizacion S3 ---
$syncDeleteFlag = if ($DryRun) { '--dryrun' } else { '--delete' }

Write-Host "Sincronizando con S3..." -ForegroundColor Cyan

if ($mediaOption -eq 't') {
  Write-Host "Subiendo TODO (reemplazando multimedia desde cero)..." -ForegroundColor Yellow
  aws s3 sync $distPath s3://$bucket $syncDeleteFlag @awsProfileArgs
}
elseif ($mediaOption -eq 'n') {
  Write-Host "Subiendo TODO (multimedia: solo nuevas/modificadas)..." -ForegroundColor Yellow
  aws s3 sync $distPath s3://$bucket $syncDeleteFlag --size-only @awsProfileArgs
}
else {
  Write-Host "Excluyendo archivos multimedia..." -ForegroundColor Yellow
  $excludeList = @('*.jpg', '*.jpeg', '*.png', '*.webp', '*.gif', '*.mp4', '*.mov', '*.avi', '*.mkv', '*.heic', '*.svg', '*.webm', '*.ogg', '*.avif')
  $excludeArgs = $excludeList | ForEach-Object { "--exclude", $_ }
  # Se usa --size-only para los archivos web (html, css, js) para maximizar la velocidad
  aws s3 sync $distPath s3://$bucket $excludeArgs $syncDeleteFlag --size-only @awsProfileArgs
}

# --- CloudFront ---
if (-not $DryRun) {
  Write-Host "Invalidando cache de CloudFront..." -ForegroundColor Cyan
  aws cloudfront create-invalidation --distribution-id $distributionId --paths '/*' @awsProfileArgs

  $cfToken = $env:CLOUDFLARE_API_TOKEN
  $cfZoneIds = if ($env:CLOUDFLARE_ZONE_IDS) { $env:CLOUDFLARE_ZONE_IDS -split ',' } else { @() }
  if ($cfToken -and $cfZoneIds.Count -gt 0) {
    Write-Host "Purgando cache de Cloudflare..." -ForegroundColor Cyan
    foreach ($zoneId in $cfZoneIds) {
      try {
        $body = '{"purge_everything":true}'
        $r = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$($zoneId.Trim())/purge_cache" -Method Post -Body $body -ContentType 'application/json' -Headers @{Authorization="Bearer $cfToken"}
        Write-Host "  OK $($zoneId.Trim()) -> $($r.result.id)" -ForegroundColor Green
      } catch {
        Write-Host "  FAIL $($zoneId.Trim()): $_" -ForegroundColor Yellow
      }
    }
  }
}
else {
  Write-Host "[DRY-RUN] Se omitieron la invalidacion de CloudFront y la purga de Cloudflare." -ForegroundColor Gray
}

Write-Host "PROCESO TERMINADO CON EXITO" -ForegroundColor Green