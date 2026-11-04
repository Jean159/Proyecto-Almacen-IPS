# ==============================================================================
# Script para Poblar Tablas SUNAT y Datos Demo dentro de Docker
# ==============================================================================

Write-Host "Poblando tablas maestras de SUNAT y catálogo demo en Docker..." -ForegroundColor Cyan

docker compose exec backend python manage.py seed_sunat
docker compose exec backend python manage.py seed_demo

Write-Host "`n¡Datos cargados con éxito!" -ForegroundColor Green
Write-Host "Credenciales demo para iniciar sesión:" -ForegroundColor Yellow
Write-Host "  Email:    admin@demo.pe" -ForegroundColor White
Write-Host "  Password: admin12345" -ForegroundColor White
