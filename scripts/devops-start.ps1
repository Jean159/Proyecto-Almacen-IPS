# ==============================================================================
# Script de Inicio Rápido DevOps (Windows PowerShell)
# Levanta el ecosistema completo: DB Postgres + Django Backend + Vite Frontend
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   ERP Almacén e Inventarios - Iniciar Entorno DevOps     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verificar si Docker está en ejecución
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Docker Desktop no está iniciado. Por favor inicia Docker e intenta nuevamente." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERROR] Docker no está instalado o no se encuentra en el PATH." -ForegroundColor Red
    exit 1
}

Write-Host "`n[1/3] Levantando contenedores en segundo plano (docker compose up -d --build)..." -ForegroundColor Yellow
docker compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Falló el levantamiento de contenedores." -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/3] Esperando que los servicios estén listos y aplicando migraciones..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`n[3/3] Verificando estado de los contenedores..." -ForegroundColor Yellow
docker compose ps

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "   ¡Servicios listos y funcionando exitosamente!          " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " • Frontend React (Vite): http://localhost:5174" -ForegroundColor White
Write-Host " • Backend API (Django):  http://127.0.0.1:8001" -ForegroundColor White
Write-Host " • Documentación Swagger: http://127.0.0.1:8001/api/docs/" -ForegroundColor White
Write-Host " • Base de datos Postgres: localhost:5434 (db: erp_almacen)" -ForegroundColor White
Write-Host "----------------------------------------------------------" -ForegroundColor Gray
Write-Host " Para poblar datos de prueba: .\scripts\seed-data.ps1" -ForegroundColor Cyan
Write-Host " Para ver logs en tiempo real: docker compose logs -f" -ForegroundColor Cyan
Write-Host " Para apagar el entorno:      docker compose down" -ForegroundColor Cyan
