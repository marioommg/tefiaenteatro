<#
.SYNOPSIS
  TODO TEFIAENTEATRO #16/#18: Verifica y aplica cifrado en reposo en buckets S3 y topics SNS.

.DESCRIPTION
  Por cada bucket de -Buckets:
    1. Comprueba que existe (head-bucket).
    2. Lee la configuracion de cifrado (get-bucket-encryption).
    3. Si no tiene SSE-S3 (AES256) por defecto, aplica put-bucket-encryption (idempotente).

  Por cada topic SNS de -SnsTopicArns (opcional, -IncludeSns o lista explicita):
    1. Lee atributos (get-topic-attributes).
    2. Comprueba KmsMasterKeyId (cifrado server-side con KMS).
    3. Si falta y -EnforceSnsEncryption, aplica alias/aws/sns (clave gestionada por AWS).

  Buckets reales de tefiaenteatro (deploy.ps1, lambdas):
    - tefiaenteatro.com (unico bucket S3 en produccion, eu-north-1)
    - tefia-revision-uploads (.env.example) NO existe en AWS; photo-report ya no sube a S3.

  Topic SNS por defecto: submit-revision (us-east-1), ver SNS_TOPIC_ARN en .env.example.

  PERMISOS: s3:HeadBucket, s3:GetEncryptionConfiguration, s3:PutEncryptionConfiguration;
  sns:GetTopicAttributes, sns:SetTopicAttributes (solo si -EnforceSnsEncryption).

.PARAMETER Profile
  Perfil AWS CLI. Obligatorio (p. ej. iam-auditor; deploy-sites no tiene permisos de config).

.PARAMETER Buckets
  Buckets a comprobar. Por defecto: tefiaenteatro.com.

.PARAMETER SnsTopicArns
  ARNs de topics SNS. Por defecto: submit-revision del account 282662225889.

.PARAMETER IncludeSns
  Incluye la comprobacion SNS aunque -SnsTopicArns no se pase explicitamente.

.PARAMETER EnforceSnsEncryption
  Aplica KmsMasterKeyId=alias/aws/sns si el topic no tiene cifrado KMS.

.PARAMETER DryRun
  Muestra acciones sin aplicar cambios.

.EXAMPLE
  .\scripts\verify-aws-encryption.ps1 -Profile iam-auditor -DryRun

.EXAMPLE
  .\scripts\verify-aws-encryption.ps1 -Profile iam-auditor -IncludeSns -EnforceSnsEncryption
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$Profile,

  [string[]]$Buckets = @('tefiaenteatro.com'),

  [string[]]$SnsTopicArns = @(),

  [switch]$IncludeSns,

  [switch]$EnforceSnsEncryption,

  [string]$SnsKmsKeyId = 'alias/aws/sns',

  [switch]$DryRun
)

$ErrorActionPreference = 'Continue'
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:AWS_PAGER = ''

$DefaultSnsTopicArn = 'arn:aws:sns:us-east-1:282662225889:submit-revision'
$ExpectedSseAlgorithm = 'AES256'

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

function Test-BucketEncryption {
  param([string]$Bucket)

  Write-Section "S3: $Bucket"

  aws s3api head-bucket --bucket $Bucket --profile $Profile 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Warn2 "El bucket '$Bucket' no existe o no es accesible. Omitiendo."
    return [PSCustomObject]@{
      Resource = "s3://$Bucket"
      Status   = 'N/A (no existe)'
      Action   = 'omitido'
    }
  }

  $algo = $null
  $encResult = Invoke-AwsJson @('s3api', 'get-bucket-encryption', '--bucket', $Bucket, '--profile', $Profile)
  if ($encResult.ExitCode -eq 0 -and $encResult.Output) {
    $enc = $encResult.Output | ConvertFrom-Json
    $algo = $enc.ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm
  }

  if ($algo -eq $ExpectedSseAlgorithm) {
    Write-Skip "Cifrado SSE-S3 ($ExpectedSseAlgorithm) ya configurado."
    return [PSCustomObject]@{
      Resource = "s3://$Bucket"
      Status   = "OK ($algo)"
      Action   = 'ninguna'
    }
  }

  $current = if ($algo) { $algo } else { 'sin cifrado por defecto' }
  Write-Action "Aplicando SSE-S3 ($ExpectedSseAlgorithm); estado actual: $current"

  if (-not $DryRun) {
    $encConfig = @{
      Rules = @(
        @{
          ApplyServerSideEncryptionByDefault = @{
            SSEAlgorithm = $ExpectedSseAlgorithm
          }
          BucketKeyEnabled = $false
        }
      )
    } | ConvertTo-Json -Depth 5 -Compress

    $tmpFile = Write-AwsTempJson $encConfig
    aws s3api put-bucket-encryption --bucket $Bucket --server-side-encryption-configuration (To-AwsFileUri $tmpFile) --profile $Profile
    $exitCode = $LASTEXITCODE
    Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
    if ($exitCode -ne 0) {
      Write-Error "Fallo al aplicar cifrado en $Bucket"
      exit 1
    }
    Write-Ok "Cifrado SSE-S3 aplicado."
    return [PSCustomObject]@{
      Resource = "s3://$Bucket"
      Status   = "OK ($ExpectedSseAlgorithm)"
      Action   = 'aplicado'
    }
  }

  return [PSCustomObject]@{
    Resource = "s3://$Bucket"
    Status   = "PENDIENTE ($ExpectedSseAlgorithm)"
    Action   = 'dry-run'
  }
}

function Test-SnsTopicEncryption {
  param([string]$TopicArn)

  Write-Section "SNS: $TopicArn"

  $attrsResult = Invoke-AwsJson @('sns', 'get-topic-attributes', '--topic-arn', $TopicArn, '--profile', $Profile)
  if ($attrsResult.ExitCode -ne 0 -or -not $attrsResult.Output) {
    Write-Warn2 "Topic no accesible o no existe. Omitiendo."
    return [PSCustomObject]@{
      Resource = $TopicArn
      Status   = 'N/A (no existe)'
      Action   = 'omitido'
    }
  }

  $attrs = ($attrsResult.Output | ConvertFrom-Json).Attributes
  $kmsKey = $attrs.KmsMasterKeyId

  if ($kmsKey) {
    Write-Skip "Cifrado KMS activo: $kmsKey"
    return [PSCustomObject]@{
      Resource = $TopicArn
      Status   = "OK (KMS: $kmsKey)"
      Action   = 'ninguna'
    }
  }

  Write-Warn2 "Sin KmsMasterKeyId (mensajes no cifrados en reposo en SNS)."

  if ($EnforceSnsEncryption) {
    Write-Action "Aplicando KmsMasterKeyId=$SnsKmsKeyId ..."
    if (-not $DryRun) {
      aws sns set-topic-attributes --topic-arn $TopicArn --attribute-name KmsMasterKeyId --attribute-value $SnsKmsKeyId --profile $Profile
      if ($LASTEXITCODE -ne 0) {
        Write-Error "Fallo al aplicar cifrado KMS en $TopicArn"
        exit 1
      }
      Write-Ok "Cifrado KMS aplicado ($SnsKmsKeyId)."
      return [PSCustomObject]@{
        Resource = $TopicArn
        Status   = "OK (KMS: $SnsKmsKeyId)"
        Action   = 'aplicado'
      }
    }
    return [PSCustomObject]@{
      Resource = $TopicArn
      Status   = "PENDIENTE (KMS: $SnsKmsKeyId)"
      Action   = 'dry-run'
    }
  }

  return [PSCustomObject]@{
    Resource = $TopicArn
    Status   = 'SIN CIFRAR'
    Action   = 'pendiente (usa -EnforceSnsEncryption)'
  }
}

Write-Host '--- TEFIAENTEATRO: verificacion / aplicacion de cifrado S3 y SNS ---' -ForegroundColor Yellow
Write-Host "Perfil AWS: $Profile" -ForegroundColor Gray
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

$results = @()

foreach ($bucket in $Buckets) {
  $results += Test-BucketEncryption -Bucket $bucket
}

$topicsToCheck = @($SnsTopicArns)
if ($IncludeSns -and $topicsToCheck.Count -eq 0) {
  $topicsToCheck = @($DefaultSnsTopicArn)
}

foreach ($topicArn in $topicsToCheck) {
  if ($topicArn) {
    $results += Test-SnsTopicEncryption -TopicArn $topicArn
  }
}

Write-Section 'Resumen'
$results | Format-Table -AutoSize

$hasIssues = $false
foreach ($r in $results) {
  if ($r.Status -match 'SIN CIFRAR|PENDIENTE|N/A') { $hasIssues = $true }
}

if ($DryRun) {
  Write-Host "`nDRY-RUN completo. Ejecuta sin -DryRun para aplicar cambios." -ForegroundColor Cyan
} elseif ($hasIssues -and -not $EnforceSnsEncryption) {
  Write-Host "`nHay recursos sin cifrado. Revisa el resumen." -ForegroundColor Yellow
}
