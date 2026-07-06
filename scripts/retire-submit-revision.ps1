<#
.SYNOPSIS
  Retira la Lambda legacy submit-revision y recursos asociados sin usar.

.DESCRIPTION
  Ejecutar SOLO después de verificar que photo-report funciona en producción.
  1. Elimina Lambda submit-revision (y su Function URL implícita).
  2. Limpia políticas obsoletas del rol compartido (SNS, S3 inline).
  3. Desuscribe y elimina el topic SNS submit-revision (solo notificaba por email).

.PARAMETER Profile
  Perfil AWS CLI. Obligatorio.

.PARAMETER DryRun
  Por defecto $true. Pasa -DryRun:$false para aplicar.

.EXAMPLE
  .\scripts\retire-submit-revision.ps1 -Profile iam-auditor
  .\scripts\retire-submit-revision.ps1 -Profile iam-auditor -DryRun:$false
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$Profile,

  [bool]$DryRun = $true
)

$ErrorActionPreference = 'Stop'
$env:AWS_PAGER = ''

$Region = 'us-east-1'
$LegacyFunction = 'submit-revision'
$RoleName = 'submit-revision-role-bt5krpvq'
$TopicArn = 'arn:aws:sns:us-east-1:282662225889:submit-revision'

function Write-Action($msg) { Write-Host "  >> $msg" -ForegroundColor Yellow }
function Write-Ok($msg) { Write-Host "  OK: $msg" -ForegroundColor Green }
function Write-Skip($msg) { Write-Host "  SKIP: $msg" -ForegroundColor Gray }

function Invoke-AwsStep {
  param([string[]]$AwsArgs, [string]$Label)
  if ($DryRun) {
    Write-Action "DRY-RUN: $Label"
    return
  }
  Write-Action $Label
  & aws @AwsArgs --profile $Profile --no-cli-pager 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Falló: $Label" }
  Write-Ok $Label
}

Write-Host '--- Retirada submit-revision (legacy) ---' -ForegroundColor Yellow
Write-Host "Perfil: $Profile | DryRun: $DryRun" -ForegroundColor Gray

# Comprobar que photo-report existe
try {
  aws lambda get-function --function-name photo-report --region $Region --profile $Profile --no-cli-pager 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'no existe' }
  Write-Ok 'Lambda photo-report encontrada (prerequisito OK)'
} catch {
  throw 'Abortado: despliega photo-report antes de retirar submit-revision.'
}

# 1. Lambda legacy
try {
  aws lambda get-function --function-name $LegacyFunction --region $Region --profile $Profile --no-cli-pager 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Invoke-AwsStep @('lambda', 'delete-function', '--function-name', $LegacyFunction, '--region', $Region) "Eliminar Lambda $LegacyFunction"
  } else {
    Write-Skip "Lambda $LegacyFunction ya no existe"
  }
} catch {
  Write-Skip "Lambda $LegacyFunction no encontrada"
}

# 2. Políticas obsoletas del rol (photo-report solo necesita SES + basic execution)
$managedToDetach = @(
  @{ Arn = 'arn:aws:iam::aws:policy/AmazonSNSFullAccess'; Name = 'AmazonSNSFullAccess' }
)
foreach ($p in $managedToDetach) {
  $attached = aws iam list-attached-role-policies --role-name $RoleName --profile $Profile --output json 2>$null | ConvertFrom-Json
  $found = @($attached.AttachedPolicies | Where-Object { $_.PolicyArn -eq $p.Arn })
  if ($found.Count -gt 0) {
    Invoke-AwsStep @('iam', 'detach-role-policy', '--role-name', $RoleName, '--policy-arn', $p.Arn) "Desadjuntar $($p.Name) de $RoleName"
  }
}

$inlineToDelete = @('PermisoSubirFotosS3')
foreach ($policyName in $inlineToDelete) {
  $inline = aws iam list-role-policies --role-name $RoleName --profile $Profile --output json 2>$null | ConvertFrom-Json
  if ($inline.PolicyNames -contains $policyName) {
    Invoke-AwsStep @('iam', 'delete-role-policy', '--role-name', $RoleName, '--policy-name', $policyName) "Eliminar inline $policyName"
  }
}

# 3. SNS topic legacy
try {
  $subs = aws sns list-subscriptions-by-topic --topic-arn $TopicArn --profile $Profile --output json 2>$null | ConvertFrom-Json
  foreach ($sub in @($subs.Subscriptions)) {
    if ($sub.SubscriptionArn -and $sub.SubscriptionArn -notmatch 'PendingConfirmation') {
      Invoke-AwsStep @('sns', 'unsubscribe', '--subscription-arn', $sub.SubscriptionArn) "Desuscribir $($sub.Endpoint)"
    }
  }
  Invoke-AwsStep @('sns', 'delete-topic', '--topic-arn', $TopicArn) "Eliminar topic SNS submit-revision"
} catch {
  Write-Skip 'Topic SNS submit-revision no encontrado o ya eliminado'
}

if ($DryRun) {
  Write-Host "`nDRY-RUN completo. Aplica con -DryRun:`$false" -ForegroundColor Cyan
} else {
  Write-Host "`nLegacy retirado. Los emails de reportes van solo vía photo-report + SES." -ForegroundColor Green
}
