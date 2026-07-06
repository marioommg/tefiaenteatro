<#
.SYNOPSIS
  TODO TEFIAENTEATRO #22: Activa (de forma idempotente) el versioning en los buckets S3
  de tefiaenteatro, y anade una regla de lifecycle para expirar versiones no-actuales
  (mismo patron aplicado en BRINDISPRODUCTIONS #16/#17).

.DESCRIPTION
  Por cada bucket de -Buckets:
    1. Verifica que el bucket existe y es accesible con el perfil indicado.
    2. Activa versioning (s3api put-bucket-versioning) SOLO si no esta ya "Enabled".
    3. Anade una regla de lifecycle "ExpireNoncurrentVersions" SOLO si no existe ya una
       regla de NoncurrentVersionExpiration (evita duplicar/perder reglas existentes).
    4. (Opcional, -EnableAccessLogging) Activa access logs S3 hacia un bucket destino
       (TODO #23), solo si no estan ya configurados.
  Es seguro ejecutarlo repetidas veces: cada paso comprueba el estado actual antes de
  aplicar ningun cambio (idempotente).

  PERMISOS REQUERIDOS: s3:GetBucketVersioning, s3:PutBucketVersioning,
  s3:GetBucketLifecycleConfiguration, s3:PutLifecycleConfiguration,
  s3:GetBucketLogging, s3:PutBucketLogging (solo si
  -EnableAccessLogging), s3:HeadBucket.

  El usuario IAM `deploy-sites` (perfil usado por deploy.ps1) SOLO tiene permisos de
  sincronizacion de objetos, NO de configuracion de bucket -> usa un perfil con permisos
  de administracion (p.ej. `iam-auditor`) con -Profile.

.PARAMETER Profile
  Perfil AWS CLI explicito. Obligatorio (no hay fallback a "default"/deploy-sites, que
  carece de permisos para estas operaciones).

.PARAMETER Buckets
  Lista de buckets a procesar. Por defecto: tefiaenteatro.com (unico bucket S3 real del
  proyecto; `tefia-revision-uploads` referenciado en .env/.env.example NO existe en AWS,
  ver AGENTS.md).

.PARAMETER NoncurrentDays
  Dias antes de expirar versiones no-actuales via lifecycle. Por defecto 30 (igual que
  el bucket principal de brindisproductions).

.PARAMETER EnableAccessLogging
  Si se indica, tambien configura access logs S3 (TODO #23) hacia -LogTargetBucket.

.PARAMETER LogTargetBucket
  Bucket destino de los access logs (debe estar en la misma region). Por defecto:
  audit-logs-282662225889 (eu-north-1, ya usado por brindisproductions).

.PARAMETER DryRun
  Muestra que cambios se aplicarian sin ejecutarlos.

.EXAMPLE
  .\scripts\enable-s3-versioning.ps1 -Profile iam-auditor -DryRun

.EXAMPLE
  .\scripts\enable-s3-versioning.ps1 -Profile iam-auditor

.EXAMPLE
  .\scripts\enable-s3-versioning.ps1 -Profile iam-auditor -EnableAccessLogging

  Cifrado S3/SNS (TODO #16/#18): usar scripts/verify-aws-encryption.ps1
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$Profile,

  [string[]]$Buckets = @('tefiaenteatro.com'),

  [int]$NoncurrentDays = 30,

  [switch]$EnableAccessLogging,

  [string]$LogTargetBucket = 'audit-logs-282662225889',

  [switch]$DryRun
)

$ErrorActionPreference = 'Continue'
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:AWS_PAGER = ""

function Write-Section($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "  OK: $msg" -ForegroundColor Green }
function Write-Skip($msg) { Write-Host "  SKIP: $msg" -ForegroundColor Gray }
function Write-Action($msg) { Write-Host "  APPLY: $msg" -ForegroundColor Yellow }
function Write-Warn2($msg) { Write-Host "  WARN: $msg" -ForegroundColor Magenta }

function Invoke-AwsJson {
  param([string[]]$AwsArgs)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'SilentlyContinue'
  $out = & aws @AwsArgs --output json 2>$null
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  return @{ ExitCode = $code; Output = $out }
}

function Write-AwsTempJson {
  param([string]$Json)
  $tmpFile = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllText($tmpFile, $Json, [System.Text.UTF8Encoding]::new($false))
  return $tmpFile
}

function To-AwsFileUri([string]$Path) {
  return ('file://' + ($Path -replace '\\', '/'))
}

function Test-LogBucketPolicyReady {
  param(
    [string]$LogBucket,
    [string]$Profile,
    [string]$AccountId
  )
  $policyResult = Invoke-AwsJson @('s3api', 'get-bucket-policy', '--bucket', $LogBucket, '--profile', $Profile)
  if ($policyResult.ExitCode -ne 0 -or -not $policyResult.Output) {
    Write-Warn2 "El bucket de logs '$LogBucket' no tiene bucket policy. S3 access logging puede fallar."
    Write-Warn2 "Anade statements para logging.s3.amazonaws.com (PutObject en s3-access-logs/*, GetBucketAcl)."
    return $false
  }
  $policyDoc = ($policyResult.Output | ConvertFrom-Json).Policy | ConvertFrom-Json
  $hasPut = $false
  $hasAcl = $false
  foreach ($stmt in @($policyDoc.Statement)) {
    $principal = $stmt.Principal
    $isLoggingService = ($principal.Service -eq 'logging.s3.amazonaws.com') -or
      ($principal -is [PSCustomObject] -and $principal.Service -contains 'logging.s3.amazonaws.com')
    if (-not $isLoggingService) { continue }
    if ($stmt.Action -match 'PutObject' -and $stmt.Resource -match 's3-access-logs') { $hasPut = $true }
    if ($stmt.Action -match 'GetBucketAcl') { $hasAcl = $true }
  }
  if ($hasPut -and $hasAcl) {
    Write-Ok "Bucket policy de '$LogBucket' lista para S3 access logs (cuenta $AccountId)."
    return $true
  }
  Write-Warn2 "Bucket policy de '$LogBucket' incompleta para S3 access logs (PutObject=$hasPut, GetBucketAcl=$hasAcl)."
  return $false
}

Write-Host "--- TEFIAENTEATRO: S3 versioning / lifecycle / (opcional) access logs ---" -ForegroundColor Yellow
Write-Host "Perfil AWS: $Profile" -ForegroundColor Gray
if ($DryRun) { Write-Host "MODO DRY-RUN: no se aplicara ningun cambio." -ForegroundColor Cyan }

try {
  $identityJson = aws sts get-caller-identity --profile $Profile --output json 2>&1
  if ($LASTEXITCODE -ne 0) { throw $identityJson }
  $identity = $identityJson | ConvertFrom-Json
  Write-Host "Autenticado como: $($identity.Arn)" -ForegroundColor Gray
} catch {
  Write-Error "No se pudo autenticar con el perfil '$Profile'. Verifica 'aws configure list-profiles'. Detalle: $_"
  exit 1
}

$results = @()
$logPolicyChecked = $false

foreach ($bucket in $Buckets) {
  Write-Section "Bucket: $bucket"

  aws s3api head-bucket --bucket $bucket --profile $Profile 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Warn2 "El bucket '$bucket' no existe o no es accesible con este perfil. Omitiendo."
    $results += [PSCustomObject]@{ Bucket = $bucket; Versioning = 'N/A (no existe)'; Lifecycle = 'N/A'; AccessLogging = 'N/A' }
    continue
  }

  # --- 1. Versioning (TODO #22) ---
  $currentStatus = 'Disabled'
  $versioningResult = Invoke-AwsJson @('s3api', 'get-bucket-versioning', '--bucket', $bucket, '--profile', $Profile)
  if ($versioningResult.ExitCode -eq 0 -and $versioningResult.Output) {
    $versioning = $versioningResult.Output | ConvertFrom-Json
    if ($versioning -and $versioning.Status) { $currentStatus = $versioning.Status }
  }

  if ($currentStatus -eq 'Enabled') {
    Write-Skip "Versioning ya esta Enabled."
  } else {
    Write-Action "Activando versioning..."
    if (-not $DryRun) {
      aws s3api put-bucket-versioning --bucket $bucket --versioning-configuration Status=Enabled --profile $Profile
      if ($LASTEXITCODE -ne 0) { Write-Error "Fallo al activar versioning en $bucket"; exit 1 }
      $currentStatus = 'Enabled'
      Write-Ok "Versioning activado."
    } else {
      $currentStatus = 'PENDIENTE (dry-run)'
    }
  }

  # --- 2. Lifecycle: expirar versiones no-actuales (extra trivial, patron brindisproductions) ---
  $lifecycleRuleId = 'ExpireNoncurrentVersions'
  $existingRules = @()
  $lifecycleResult = Invoke-AwsJson @('s3api', 'get-bucket-lifecycle-configuration', '--bucket', $bucket, '--profile', $Profile)
  if ($lifecycleResult.ExitCode -eq 0 -and $lifecycleResult.Output) {
    $existingLifecycle = $lifecycleResult.Output | ConvertFrom-Json
    if ($existingLifecycle -and $existingLifecycle.Rules) { $existingRules = @($existingLifecycle.Rules) }
  }

  $hasNoncurrentRule = $false
  foreach ($r in $existingRules) {
    if ($r.NoncurrentVersionExpiration) { $hasNoncurrentRule = $true }
  }

  $lifecycleStatus = "Enabled ($NoncurrentDays d)"
  if ($hasNoncurrentRule) {
    Write-Skip "Ya existe una regla de lifecycle para versiones no-actuales."
    $lifecycleStatus = 'Ya existia'
  } else {
    Write-Action "Anadiendo regla de lifecycle '$lifecycleRuleId' (expira a los $NoncurrentDays dias)..."
    if (-not $DryRun) {
      $newRule = [ordered]@{
        ID                          = $lifecycleRuleId
        Filter                      = @{}
        Status                      = 'Enabled'
        NoncurrentVersionExpiration = @{ NoncurrentDays = $NoncurrentDays }
        Expiration                  = @{ ExpiredObjectDeleteMarker = $true }
      }
      $allRules = @($existingRules) + $newRule
      $lifecycleConfig = @{ Rules = $allRules } | ConvertTo-Json -Depth 10 -Compress

      $tmpFile = Write-AwsTempJson $lifecycleConfig
      aws s3api put-bucket-lifecycle-configuration --bucket $bucket --lifecycle-configuration (To-AwsFileUri $tmpFile) --profile $Profile
      $exitCode = $LASTEXITCODE
      Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
      if ($exitCode -ne 0) { Write-Error "Fallo al aplicar lifecycle en $bucket"; exit 1 }
      Write-Ok "Lifecycle aplicado ($NoncurrentDays dias)."
    } else {
      $lifecycleStatus = 'PENDIENTE (dry-run)'
    }
  }

  # --- 3. Access logging (TODO #23 - opcional, solo si -EnableAccessLogging) ---
  $loggingStatus = 'No solicitado (usa -EnableAccessLogging o setup-access-logs.ps1)'
  if ($EnableAccessLogging) {
    if (-not $logPolicyChecked) {
      Write-Section "Verificando bucket policy de logs ($LogTargetBucket)"
      if ($DryRun) {
        Write-Host "  (dry-run) Comprobaria policy de logging.s3.amazonaws.com en $LogTargetBucket" -ForegroundColor Gray
      } else {
        Test-LogBucketPolicyReady -LogBucket $LogTargetBucket -Profile $Profile -AccountId $identity.Account | Out-Null
      }
      $logPolicyChecked = $true
    }

    $logging = $null
    $loggingResult = Invoke-AwsJson @('s3api', 'get-bucket-logging', '--bucket', $bucket, '--profile', $Profile)
    if ($loggingResult.ExitCode -eq 0 -and $loggingResult.Output) { $logging = $loggingResult.Output | ConvertFrom-Json }

    if ($logging -and $logging.LoggingEnabled) {
      $loggingStatus = "Ya activo -> $($logging.LoggingEnabled.TargetBucket)/$($logging.LoggingEnabled.TargetPrefix)"
      Write-Skip "Access logs ya configurados ($loggingStatus)."
    } else {
      $targetPrefix = "s3-access-logs/$bucket/"
      Write-Action "Activando access logs -> $LogTargetBucket/$targetPrefix ..."
      if (-not $DryRun) {
        $loggingConfig = @{ LoggingEnabled = @{ TargetBucket = $LogTargetBucket; TargetPrefix = $targetPrefix } } | ConvertTo-Json -Depth 5 -Compress
        $tmpFile2 = Write-AwsTempJson $loggingConfig
        aws s3api put-bucket-logging --bucket $bucket --bucket-logging-status (To-AwsFileUri $tmpFile2) --profile $Profile
        $exitCode2 = $LASTEXITCODE
        Remove-Item $tmpFile2 -Force -ErrorAction SilentlyContinue
        if ($exitCode2 -ne 0) { Write-Error "Fallo al activar access logs en $bucket"; exit 1 }
        $loggingStatus = "Activado -> $LogTargetBucket/$targetPrefix"
        Write-Ok "Access logs activados."
      } else {
        $loggingStatus = "PENDIENTE (dry-run) -> $LogTargetBucket/$targetPrefix"
      }
    }
  }

  $results += [PSCustomObject]@{
    Bucket        = $bucket
    Versioning    = $currentStatus
    Lifecycle     = $lifecycleStatus
    AccessLogging = $loggingStatus
  }
}

Write-Section "Resumen"
$results | Format-Table -AutoSize

if ($DryRun) {
  Write-Host "`nDRY-RUN completo. Ejecuta sin -DryRun para aplicar los cambios." -ForegroundColor Cyan
}
