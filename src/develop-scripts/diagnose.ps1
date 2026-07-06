# diagnose.ps1
Write-Host "=== Diagnóstico AWS CLI ===" -ForegroundColor Cyan

Write-Host "1. Verificando configuración AWS..." -ForegroundColor Yellow
try {
    aws configure list
    Write-Host "✓ Configuración AWS OK" -ForegroundColor Green
} catch {
    Write-Host "✗ Error en configuración AWS: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Verificando identidad..." -ForegroundColor Yellow
try {
    aws sts get-caller-identity --output table
    Write-Host "✓ Identidad verificada" -ForegroundColor Green
} catch {
    Write-Host "✗ Error de identidad: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Probando conectividad básica a S3..." -ForegroundColor Yellow
try {
    $result = aws s3 ls --output text 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Conectividad básica a S3 OK" -ForegroundColor Green
    } else {
        Write-Host "✗ Error conectividad S3: $result" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. Probando bucket específico..." -ForegroundColor Yellow
try {
    $result = aws s3 ls s3://tefiaenteatro.com --output text 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Acceso al bucket OK" -ForegroundColor Green
    } else {
        Write-Host "✗ Error acceso bucket: $result" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n5. Verificando conectividad de red..." -ForegroundColor Yellow
try {
    $connection = Test-NetConnection s3.eu-north-1.amazonaws.com -Port 443 -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "✓ Conectividad de red OK" -ForegroundColor Green
    } else {
        Write-Host "✗ No se puede conectar a S3 por red" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Error de red: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Fin del diagnóstico ===" -ForegroundColor Cyan
