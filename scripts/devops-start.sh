#!/usr/bin/env bash
# ==============================================================================
# Script de Inicio Rápido DevOps (Linux / macOS Bash)
# ==============================================================================
set -e

echo "=========================================================="
echo "   ERP Almacén e Inventarios - Iniciar Entorno DevOps     "
echo "=========================================================="

if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] Docker daemon no está corriendo. Inicia Docker primero."
    exit 1
fi

echo -e "\n[1/3] Levantando contenedores (docker compose up -d --build)..."
docker compose up -d --build

echo -e "\n[2/3] Esperando estabilización de servicios..."
sleep 5

echo -e "\n[3/3] Estado de los contenedores:"
docker compose ps

echo -e "\n=========================================================="
echo "   ¡Servicios listos y funcionando exitosamente!          "
echo "=========================================================="
echo " • Frontend React (Vite): http://localhost:5174"
echo " • Backend API (Django):  http://127.0.0.1:8001"
echo " • Documentación Swagger: http://127.0.0.1:8001/api/docs/"
echo " • Base de datos Postgres: localhost:5434"
