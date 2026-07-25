#Requires -Version 5.1
<#
.SYNOPSIS
  Crea/actualiza el rol OIDC de GitHub Actions para deploy de tefiaenteatro.
  Requiere IdP OIDC de la cuenta (piloto radiopatio). Dry-run por defecto.
#>
param(
  [string]$Profile = "iam-auditor-mfa",
  [switch]$Apply,
  [string]$RoleName = "github-actions-deploy-tefia",
  [string]$PolicyName = "GitHubActionsDeployTefia",
  [string]$AccountId = "282662225889",
  [string]$GithubOrgRepo = "marioommg/tefiaenteatro"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TrustPath = Join-Path $ScriptDir "iam\github-oidc-trust.json"
$PolicyPath = Join-Path $ScriptDir "iam\github-oidc-deploy-policy.json"
$OidcArn = "arn:aws:iam::${AccountId}:oidc-provider/token.actions.githubusercontent.com"
$RoleArn = "arn:aws:iam::${AccountId}:role/$RoleName"

function Invoke-Aws {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$AwsArgs)
  & aws @AwsArgs --profile $Profile --no-cli-pager
  if ($LASTEXITCODE -ne 0) { throw "aws $($AwsArgs -join ' ') failed ($LASTEXITCODE)" }
}

Write-Host "`n=== GitHub OIDC deploy setup (tefiaenteatro) ===" -ForegroundColor Cyan
Write-Host "Profile: $Profile"
Write-Host "Mode:    $(if ($Apply) { 'APPLY' } else { 'DRY-RUN' })"
Write-Host "Role:    $RoleArn"
Write-Host "Repo:    $GithubOrgRepo (ref main only)`n"

$identity = Invoke-Aws sts get-caller-identity --output json | ConvertFrom-Json
Write-Host "Caller:  $($identity.Arn)"

$providers = Invoke-Aws iam list-open-id-connect-providers --output json | ConvertFrom-Json
$hasOidc = $providers.OpenIDConnectProviderList | Where-Object { $_.Arn -eq $OidcArn }
if (-not $hasOidc) {
  throw "Falta el OIDC provider $OidcArn. Créalo primero (piloto colectivoradiopatio)."
}
Write-Host "[OK] OIDC provider existe"

$roleExists = $false
$prevErr = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$roleCheck = & aws iam get-role --role-name $RoleName --profile $Profile --no-cli-pager --output json 2>$null
$ErrorActionPreference = $prevErr
if ($LASTEXITCODE -eq 0 -and $roleCheck) {
  $roleExists = $true
  Write-Host "[~] Rol ya existe: $RoleName"
} else {
  Write-Host "[+] Crear rol: $RoleName"
}

Write-Host "[+] Trust: solo refs/heads/main"
Write-Host "[+] Policy: bucket tefiaenteatro.com + CF E29CMKJWGWAZ58"
Write-Host "`nGitHub Variable AWS_DEPLOY_ROLE_ARN=$RoleArn"

if (-not $Apply) {
  Write-Host "`nDry-run terminado. Pasa -Apply para crear.`n" -ForegroundColor Green
  exit 0
}

Write-Host "`n--- Applying ---" -ForegroundColor Cyan

if (-not $roleExists) {
  Invoke-Aws iam create-role `
    --role-name $RoleName `
    --assume-role-policy-document "file://$TrustPath" `
    --description "GitHub Actions deploy (S3+CF) for tefiaenteatro main" `
    --tags "Key=Owner,Value=tefiaenteatro" "Key=Purpose,Value=GitHub-Actions-static-deploy"
  Write-Host "Created role $RoleName"
} else {
  Invoke-Aws iam update-assume-role-policy `
    --role-name $RoleName `
    --policy-document "file://$TrustPath"
  Write-Host "Updated trust on $RoleName"
}

Invoke-Aws iam put-role-policy `
  --role-name $RoleName `
  --policy-name $PolicyName `
  --policy-document "file://$PolicyPath"

Write-Host "`nDone. Role ARN: $RoleArn`n" -ForegroundColor Green
