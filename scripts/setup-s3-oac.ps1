<#
.SYNOPSIS
  TODO TEFIAENTEATRO #24: Migra (de forma idempotente) el acceso S3 de CloudFront de OAI
  (Origin Access Identity, deprecado) a OAC (Origin Access Control).

.DESCRIPTION
  Por defecto opera sobre el bucket tefiaenteatro.com y la distribución E29CMKJWGWAZ58.
  Pasos (cada uno comprueba el estado actual antes de aplicar cambios):
    1. Crear OAC si no existe (nombre oac-tefia-prod, sigv4, always).
    2. Actualizar el origen S3 de CloudFront para usar OriginAccessControlId y vaciar OAI.
    3. Actualizar la bucket policy para acceso exclusivo vía OAC (cloudfront.amazonaws.com +
       condición AWS:SourceArn). Elimina statements legacy de OAI si los hubiera.
    4. Eliminar OAIs huérfanos asociados a esta distribución/bucket (si ya no se usan).

  Es seguro ejecutarlo repetidas veces: idempotente.

  PERMISOS REQUERIDOS: cloudfront:CreateOriginAccessControl,
  cloudfront:GetOriginAccessControl, cloudfront:ListOriginAccessControls,
  cloudfront:GetDistributionConfig, cloudfront:UpdateDistribution,
  cloudfront:ListCloudFrontOriginAccessIdentities,
  cloudfront:DeleteCloudFrontOriginAccessIdentity,
  s3:GetBucketPolicy, s3:PutBucketPolicy, s3:HeadBucket.

  El perfil deploy-sites solo sincroniza objetos; usa un perfil con permisos de
  administración (p. ej. iam-auditor) con -Profile.

.PARAMETER Profile
  Perfil AWS CLI explícito. Obligatorio.

.PARAMETER Bucket
  Bucket S3 origen. Por defecto: tefiaenteatro.com.

.PARAMETER DistributionId
  ID de la distribución CloudFront. Por defecto: E29CMKJWGWAZ58.

.PARAMETER AccountId
  ID de cuenta AWS. Por defecto: 282662225889.

.PARAMETER OacName
  Nombre del Origin Access Control. Por defecto: oac-tefia-prod.

.PARAMETER S3Region
  Región del bucket S3. Por defecto: eu-north-1.

.PARAMETER DryRun
  Muestra qué cambios se aplicarían sin ejecutarlos.

.EXAMPLE
  .\scripts\setup-s3-oac.ps1 -Profile iam-auditor -DryRun

.EXAMPLE
  .\scripts\setup-s3-oac.ps1 -Profile iam-auditor
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$Profile,

  [string]$Bucket = 'tefiaenteatro.com',

  [string]$DistributionId = 'E29CMKJWGWAZ58',

  [string]$AccountId = '282662225889',

  [string]$OacName = 'oac-tefia-prod',

  [string]$S3Region = 'eu-north-1',

  [switch]$DryRun
)

$ErrorActionPreference = 'Continue'
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:AWS_PAGER = ''

$OacPolicySid = 'AllowCloudFrontServicePrincipal'
$DistributionArn = "arn:aws:cloudfront::${AccountId}:distribution/${DistributionId}"
$S3OriginDomain = "${Bucket}.s3.${S3Region}.amazonaws.com"

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

function Get-DesiredBucketPolicy {
  return @{
    Version   = '2012-10-17'
    Id        = 'PolicyForCloudFrontPrivateContent'
    Statement = @(
      @{
        Sid       = $OacPolicySid
        Effect    = 'Allow'
        Principal = @{ Service = 'cloudfront.amazonaws.com' }
        Action    = 's3:GetObject'
        Resource  = "arn:aws:s3:::${Bucket}/*"
        Condition = @{
          StringEquals = @{
            'AWS:SourceArn' = $DistributionArn
          }
        }
      }
    )
  }
}

function Test-IsOaiStatement {
  param($Statement)
  if (-not $Statement) { return $false }
  $principal = $Statement.Principal
  if ($principal.CanonicalUser) { return $true }
  if ($principal.AWS) {
    $aws = $principal.AWS
    if ($aws -is [string]) { $aws = @($aws) }
    foreach ($p in $aws) {
      if ($p -match 'cloudfront' -or $p -match 'Origin Access Identity') { return $true }
    }
  }
  return $false
}

function Test-OacStatementEquivalent {
  param($Stmt, $Desired)

  if (-not $Stmt -or -not $Desired) { return $false }
  if ($Stmt.Sid -ne $Desired.Sid) { return $false }
  if ($Stmt.Effect -ne $Desired.Effect) { return $false }
  if ($Stmt.Action -ne $Desired.Action) { return $false }
  if ($Stmt.Resource -ne $Desired.Resource) { return $false }

  $stmtSvc = if ($Stmt.Principal.Service) { $Stmt.Principal.Service } else { $null }
  $desiredSvc = if ($Desired.Principal -is [hashtable]) { $Desired.Principal['Service'] } else { $Desired.Principal.Service }
  if ($stmtSvc -ne $desiredSvc) { return $false }

  $stmtArn = $Stmt.Condition.StringEquals.'AWS:SourceArn'
  $desiredArn = if ($Desired.Condition.StringEquals -is [hashtable]) {
    $Desired.Condition.StringEquals['AWS:SourceArn']
  } else {
    $Desired.Condition.StringEquals.'AWS:SourceArn'
  }
  return $stmtArn -eq $desiredArn
}

function Merge-BucketPolicyForOac {
  param([object]$ExistingPolicy)

  $desiredStmt = (Get-DesiredBucketPolicy).Statement[0]
  $parsed = $null
  if ($ExistingPolicy) {
    if ($ExistingPolicy -is [string]) {
      $parsed = $ExistingPolicy | ConvertFrom-Json
    } else {
      $parsed = $ExistingPolicy
    }
  }

  $statements = [System.Collections.ArrayList]@()
  if ($parsed -and $parsed.Statement) {
    $statements.AddRange(@($parsed.Statement))
  }

  # Quitar statements legacy OAI
  $removedOai = 0
  for ($i = $statements.Count - 1; $i -ge 0; $i--) {
    if (Test-IsOaiStatement $statements[$i]) {
      $statements.RemoveAt($i) | Out-Null
      $removedOai++
    }
  }

  $idx = -1
  for ($i = 0; $i -lt $statements.Count; $i++) {
    if ($statements[$i].Sid -eq $OacPolicySid) { $idx = $i; break }
  }

  $changed = $removedOai -gt 0
  if ($idx -ge 0) {
    if (-not (Test-OacStatementEquivalent $statements[$idx] $desiredStmt)) {
      $statements[$idx] = $desiredStmt
      $changed = $true
    }
  } else {
    $statements.Add($desiredStmt) | Out-Null
    $changed = $true
  }

  $version = if ($parsed -and $parsed.Version) { $parsed.Version } else { '2012-10-17' }
  $id = if ($parsed -and $parsed.Id) { $parsed.Id } else { 'PolicyForCloudFrontPrivateContent' }

  $policy = @{
    Version   = $version
    Id        = $id
    Statement = @($statements)
  }
  return @{ Policy = $policy; Changed = $changed; RemovedOai = $removedOai }
}

Write-Host '--- TEFIAENTEATRO: migracion OAI a OAC (CloudFront + S3) ---' -ForegroundColor Yellow
Write-Host "Perfil AWS: $Profile" -ForegroundColor Gray
Write-Host "Bucket: $Bucket | CloudFront: $DistributionId | OAC: $OacName" -ForegroundColor Gray
if ($DryRun) { Write-Host 'MODO DRY-RUN: no se aplicara ningun cambio.' -ForegroundColor Cyan }

try {
  $identityJson = aws sts get-caller-identity --profile $Profile --output json 2>&1
  if ($LASTEXITCODE -ne 0) { throw $identityJson }
  $identity = $identityJson | ConvertFrom-Json
  Write-Host "Autenticado como: $($identity.Arn)" -ForegroundColor Gray
} catch {
  Write-Error "No se pudo autenticar con el perfil '$Profile'. Detalle: $_"
  exit 1
}

aws s3api head-bucket --bucket $Bucket --profile $Profile 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Error "El bucket '$Bucket' no existe o no es accesible con este perfil."
  exit 1
}

# --- 1. OAC ---
Write-Section '1. Origin Access Control (OAC)'

$oacId = $null
$oacList = Invoke-AwsJson @('cloudfront', 'list-origin-access-controls', '--profile', $Profile)
if ($oacList.ExitCode -eq 0 -and $oacList.Output) {
  $parsed = $oacList.Output | ConvertFrom-Json
  $items = @($parsed.OriginAccessControlList.Items)
  $match = $items | Where-Object { $_.Name -eq $OacName } | Select-Object -First 1
  if ($match) { $oacId = $match.Id }
}

if ($oacId) {
  Write-Skip "OAC '$OacName' ya existe ($oacId)."
} else {
  Write-Action "Creando OAC '$OacName'..."
  if (-not $DryRun) {
    $oacConfig = @{
      Name                              = $OacName
      Description                       = "OAC para $Bucket (CloudFront $DistributionId)"
      SigningProtocol                   = 'sigv4'
      SigningBehavior                   = 'always'
      OriginAccessControlOriginType     = 's3'
    } | ConvertTo-Json -Depth 5 -Compress
    $tmpOac = Write-AwsTempJson $oacConfig
    $createOut = aws cloudfront create-origin-access-control --origin-access-control-config (To-AwsFileUri $tmpOac) --profile $Profile --output json 2>&1
    Remove-Item $tmpOac -Force -ErrorAction SilentlyContinue
    if ($LASTEXITCODE -ne 0) { Write-Error "Fallo al crear OAC: $createOut"; exit 1 }
    $oacId = ($createOut | ConvertFrom-Json).OriginAccessControl.Id
    Write-Ok "OAC creado: $oacId"
  } else {
    $oacId = '(nuevo en apply)'
    Write-Ok 'DRY-RUN: se crearia el OAC.'
  }
}

# --- 2. CloudFront origin ---
Write-Section '2. Origen S3 en CloudFront'

$cfResult = Invoke-AwsJson @('cloudfront', 'get-distribution-config', '--id', $DistributionId, '--profile', $Profile)
if ($cfResult.ExitCode -ne 0 -or -not $cfResult.Output) {
  Write-Error "No se pudo leer la distribución CloudFront $DistributionId."
  exit 1
}

$cfResponse = $cfResult.Output | ConvertFrom-Json
$cfEtag = $cfResponse.ETag
$cfConfig = $cfResponse.DistributionConfig
$origins = @($cfConfig.Origins.Items)
$s3Origin = $origins | Where-Object {
  $_.DomainName -eq $S3OriginDomain -or $_.DomainName -like "${Bucket}.s3*"
} | Select-Object -First 1

if (-not $s3Origin) {
  Write-Error "No se encontró origen S3 para $Bucket en la distribución $DistributionId."
  exit 1
}

$currentOac = $s3Origin.OriginAccessControlId
$currentOai = $s3Origin.S3OriginConfig.OriginAccessIdentity
$needsCfUpdate = $false

if ($DryRun -and $oacId -eq '(nuevo en apply)') {
  $targetOacId = 'PENDING_NEW_OAC'
} else {
  $targetOacId = $oacId
}

if ($currentOac -ne $targetOacId -and $targetOacId -ne 'PENDING_NEW_OAC') {
  $needsCfUpdate = $true
  Write-Action "OriginAccessControlId: '$currentOac' -> '$targetOacId'"
} elseif ($currentOac -eq $targetOacId -and $targetOacId -ne 'PENDING_NEW_OAC') {
  Write-Skip "OriginAccessControlId ya es $currentOac."
} elseif ($DryRun) {
  Write-Action 'Se asignara OriginAccessControlId al origen S3.'
  $needsCfUpdate = $true
}

if ($currentOai -and $currentOai.Trim() -ne '') {
  $needsCfUpdate = $true
  Write-Action "Eliminando OAI legacy del origen: $currentOai"
} else {
  Write-Skip 'Sin OAI en el origen S3 (correcto para OAC).'
}

if ($needsCfUpdate) {
  if (-not $DryRun) {
    $s3Origin.OriginAccessControlId = $targetOacId
    if (-not $s3Origin.S3OriginConfig) {
      $s3Origin | Add-Member -NotePropertyName S3OriginConfig -NotePropertyValue @{ OriginAccessIdentity = ''; OriginReadTimeout = 30 }
    } else {
      $s3Origin.S3OriginConfig.OriginAccessIdentity = ''
    }

    $cfConfig.Origins.Items = $origins
    $cfConfig.Origins.Quantity = $origins.Count

    $tmpCf = Write-AwsTempJson ($cfConfig | ConvertTo-Json -Depth 30 -Compress)
    aws cloudfront update-distribution --id $DistributionId --if-match $cfEtag --distribution-config (To-AwsFileUri $tmpCf) --profile $Profile 2>&1 | Out-Null
    $cfExit = $LASTEXITCODE
    Remove-Item $tmpCf -Force -ErrorAction SilentlyContinue
    if ($cfExit -ne 0) { Write-Error 'Fallo al actualizar CloudFront.'; exit 1 }
    Write-Ok 'Distribucion CloudFront actualizada (despliegue 3-5 min).'
  } else {
    Write-Ok 'DRY-RUN: se actualizaria el origen S3 en CloudFront.'
  }
} else {
  Write-Skip 'Origen CloudFront ya configurado con OAC.'
}

# --- 3. Bucket policy ---
Write-Section '3. Bucket policy (acceso OAC-only)'

$existingPolicy = $null
$policyResult = Invoke-AwsJson @('s3api', 'get-bucket-policy', '--bucket', $Bucket, '--profile', $Profile)
if ($policyResult.ExitCode -eq 0 -and $policyResult.Output) {
  $existingPolicy = ($policyResult.Output | ConvertFrom-Json).Policy
}

$merge = Merge-BucketPolicyForOac -ExistingPolicy $existingPolicy
if ($merge.RemovedOai -gt 0) {
  Write-Action "Eliminando $($merge.RemovedOai) statement(s) legacy OAI de la bucket policy."
}

if ($merge.Changed) {
  if (-not $DryRun) {
    $tmpPolicy = Write-AwsTempJson ($merge.Policy | ConvertTo-Json -Depth 20 -Compress)
    aws s3api put-bucket-policy --bucket $Bucket --policy (To-AwsFileUri $tmpPolicy) --profile $Profile 2>&1 | Out-Null
    $polExit = $LASTEXITCODE
    Remove-Item $tmpPolicy -Force -ErrorAction SilentlyContinue
    if ($polExit -ne 0) { Write-Error 'Fallo al actualizar bucket policy.'; exit 1 }
    Write-Ok 'Bucket policy actualizada (solo OAC).'
  } else {
    Write-Ok 'DRY-RUN: se actualizaria la bucket policy.'
  }
} else {
  Write-Skip 'Bucket policy ya correcta para OAC.'
}

# --- 4. Eliminar OAI huérfanos ---
Write-Section '4. OAI legacy (deprecado)'

$oaiListResult = Invoke-AwsJson @('cloudfront', 'list-cloud-front-origin-access-identities', '--profile', $Profile)
$oaiItems = @()
if ($oaiListResult.ExitCode -eq 0 -and $oaiListResult.Output) {
  $oaiParsed = $oaiListResult.Output | ConvertFrom-Json
  if ($oaiParsed.CloudFrontOriginAccessIdentityList.Items) {
    $oaiItems = @($oaiParsed.CloudFrontOriginAccessIdentityList.Items)
  }
}

if ($oaiItems.Count -eq 0) {
  Write-Skip 'No hay OAIs en la cuenta (ya migrado o nunca configurado).'
} else {
  foreach ($oai in $oaiItems) {
    $oaiId = $oai.Id
    $oaiPath = "origin-access-identity/cloudfront/$oaiId"
    $comment = $oai.Comment

  $inUse = $false
  $distMarker = $Bucket
  if ($comment -and ($comment -match [regex]::Escape($Bucket) -or $comment -match [regex]::Escape($DistributionId))) {
    # Posible OAI de este sitio; comprobar si alguna distribución lo referencia
    $allDists = Invoke-AwsJson @('cloudfront', 'list-distributions', '--profile', $Profile)
    if ($allDists.ExitCode -eq 0 -and $allDists.Output) {
      $distItems = @($allDists.Output | ConvertFrom-Json).DistributionList.Items
      foreach ($dist in $distItems) {
        $fullDist = Invoke-AwsJson @('cloudfront', 'get-distribution-config', '--id', $dist.Id, '--profile', $Profile)
        if ($fullDist.ExitCode -ne 0) { continue }
        $cfg = ($fullDist.Output | ConvertFrom-Json).DistributionConfig
        foreach ($origin in @($cfg.Origins.Items)) {
          $oaiRef = $origin.S3OriginConfig.OriginAccessIdentity
          if ($oaiRef -and $oaiRef -like "*$oaiId*") {
            $inUse = $true
            break
          }
        }
        if ($inUse) { break }
      }
    }
  } else {
    # OAI sin relación obvia con este bucket; no tocar
    Write-Skip "OAI $oaiId ($comment) no parece de $Bucket; no se elimina."
    continue
  }

    if ($inUse) {
      Write-Warn2 "OAI $oaiId aun referenciado por otra distribucion; no se elimina automaticamente."
    } else {
      Write-Action "Eliminando OAI huerfano $oaiId ($comment)..."
      if (-not $DryRun) {
        $oaiDetail = Invoke-AwsJson @('cloudfront', 'get-cloud-front-origin-access-identity', '--id', $oaiId, '--profile', $Profile)
        if ($oaiDetail.ExitCode -ne 0) { Write-Warn2 "No se pudo leer OAI $oaiId"; continue }
        $oaiEtag = ($oaiDetail.Output | ConvertFrom-Json).ETag
        aws cloudfront delete-cloud-front-origin-access-identity --id $oaiId --if-match $oaiEtag --profile $Profile 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
          Write-Ok "OAI $oaiId eliminado."
        } else {
          Write-Warn2 "No se pudo eliminar OAI $oaiId (puede estar en uso)."
        }
      } else {
        Write-Ok "DRY-RUN: se eliminaria OAI $oaiId."
      }
    }
  }
}

Write-Section 'Resumen'
Write-Host @"
  OAC:          $OacName ($oacId)
  CloudFront:   $DistributionId -> origen $S3OriginDomain
  Bucket:       $Bucket (policy OAC-only)
"@ -ForegroundColor Gray

if ($DryRun) {
  Write-Host "`nDRY-RUN completo. Ejecuta sin -DryRun para aplicar los cambios." -ForegroundColor Cyan
} else {
  Write-Host ''
  Write-Host 'Migracion OAI a OAC verificada/aplicada.' -ForegroundColor Green
  Write-Host 'Nota: si CloudFront se actualizo, espera 3-5 min antes de invalidar cache.' -ForegroundColor Gray
}
