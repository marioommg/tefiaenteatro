<#
.SYNOPSIS
  TODO TEFIAENTEATRO #23: Habilita S3 server access logging (idempotente).

.DESCRIPTION
  Envía logs del bucket de hosting hacia el bucket centralizado de auditoría
  (mismo patrón que COLECTIVORADIOPATIO #17 / brindisproductions #17):

    s3://audit-logs-282662225889/s3-access-logs/<bucket>/

  El bucket de logs ya tiene bucket policy global para logging.s3.amazonaws.com
  (statements S3ServerAccessLogsAcl / S3ServerAccessLogsWrite en la cuenta
  282662225889). Este script solo activa put-bucket-logging en el origen.

  Buckets procesados por defecto: tefiaenteatro.com (único bucket S3 real).
  `tefia-revision-uploads` (referenciado en .env.example) NO existe en AWS.

  CloudFront standard access logs: DESCARTADO (plan Free, ver TODO #12).

.PARAMETER Profile
  Perfil AWS con permisos s3:GetBucketLogging, s3:PutBucketLogging,
  s3:GetBucketPolicy (solo lectura en bucket de logs). Usar iam-auditor.

.PARAMETER Buckets
  Buckets origen. Por defecto: tefiaenteatro.com

.PARAMETER LogTargetBucket
  Bucket destino de logs. Por defecto: audit-logs-282662225889

.PARAMETER DryRun
  Vista previa sin aplicar cambios.

.EXAMPLE
  .\scripts\setup-access-logs.ps1 -Profile iam-auditor -DryRun

.EXAMPLE
  .\scripts\setup-access-logs.ps1 -Profile iam-auditor
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$Profile,

  [string[]]$Buckets = @('tefiaenteatro.com'),

  [string]$LogTargetBucket = 'audit-logs-282662225889',

  [switch]$DryRun
)

$invokeArgs = @{
  Profile              = $Profile
  Buckets              = $Buckets
  LogTargetBucket      = $LogTargetBucket
  EnableAccessLogging  = $true
}
if ($DryRun) { $invokeArgs['DryRun'] = $true }

& (Join-Path $PSScriptRoot 'enable-s3-versioning.ps1') @invokeArgs
