# ERP Almacén e Inventarios

Módulo ERP de almacén, inventario permanente, kardex valorizado y PLE SUNAT 12.1 / 13.1.

## Stack

Django 5 + DRF + PostgreSQL 16 · React 18 + TypeScript + Vite + Tailwind · Docker.

## Ejecución

### Opción 1: Con Docker Compose

Levanta la base de datos (puerto 5434), el backend Django (puerto 8001) y el frontend Vite (puerto 5174):

```bash
docker compose up -d --build
```

O mediante los scripts de soporte:
- PowerShell: `.\scripts\devops-start.ps1`
- Bash: `./scripts/devops-start.sh`

Para cargar datos iniciales de SUNAT y catálogo de prueba:
```powershell
.\scripts\seed-data.ps1
```

### Opción 2: Ejecución Local

1. Base de datos:
```bash
docker compose up -d db
```

2. Backend:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate    # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_sunat
python manage.py seed_demo
python manage.py runserver 0.0.0.0:8001
```

3. Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Servicios y Accesos

- Frontend: http://localhost:5174
- Backend API: http://127.0.0.1:8001
- Documentación Swagger: http://127.0.0.1:8001/api/docs/
- PostgreSQL: `localhost:5434` (DB: `erp_almacen`, usuario: `erp_almacen`)

## Credenciales Demo

- Email: `admin@demo.pe`
- Password: `admin12345`

## Documentación Técnica

- [Arquitectura del Sistema](docs/arquitectura.md)
- [Especificación OpenAPI / Swagger](docs/openapi.yaml)
- [Decisiones de Diseño](docs/decisiones.md)
- [Cumplimiento SUNAT PLE 12.1 y 13.1](docs/ple.md)
