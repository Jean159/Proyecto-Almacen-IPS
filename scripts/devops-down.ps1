# ==============================================================================
# Script para Detener el Entorno DevOps
# ==============================================================================

Write-Host "Deteniendo contenedores de ERP Almacén..." -ForegroundColor Yellow
docker compose down

Write-Host "Entorno detenido correctamente." -ForegroundColor Green
