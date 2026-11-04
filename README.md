# ERP Almacén e Inventarios

Módulo ERP de almacén, inventario permanente, kardex valorizado y PLE SUNAT 12.1 / 13.1.

## Stack

Django 5 + DRF + PostgreSQL 16 · React 18 + TypeScript + Vite + Tailwind.

## Ejecutar

```bash
docker compose up -d db

cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 0.0.0.0:8001
```

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

## URLs

- Frontend: http://localhost:5174
- Backend: http://127.0.0.1:8001
- Swagger: http://127.0.0.1:8001/api/docs/

## Demo

- Email: `admin@demo.pe`
- Password: `admin12345`
