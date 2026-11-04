# ERP Almacén e Inventarios

Módulo de almacén, inventario permanente y PLE SUNAT 12.1 / 13.1, con backend
Django y frontend React.

## Stack

- Python 3.11+ (probado con 3.13)
- Django 5.2 LTS + Django REST Framework
- PostgreSQL 16 (Docker)
- JWT con SimpleJWT
- OpenAPI con drf-spectacular
- pytest + pytest-django + factory-boy
- Ruff para lint y formato
- React 18 + TypeScript + Vite + Tailwind
- TanStack Query, Zustand, React Hook Form + Zod

## Inicio rápido

```bash
# 1. Base de datos
docker compose up -d db

# 2. Entorno Python
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Configuración
cp .env.example .env

# 4. Migraciones y datos demo
python manage.py migrate
python manage.py seed_demo

# 5. Servidor
python manage.py runserver 0.0.0.0:8001

# 6. Frontend (otra terminal, desde la raíz del proyecto)
cd frontend
npm install
npm run dev
```

La base de datos de desarrollo escucha en `127.0.0.1:5434` para no chocar con
otros proyectos PostgreSQL. El frontend queda en `http://127.0.0.1:5174` y
usa el proxy de Vite hacia el backend en `8001`.

Credenciales demo:

- Email: `admin@demo.pe`
- Password: `admin12345`
- RUC: `20123456786`

## Documentación

- Swagger UI: `http://127.0.0.1:8001/api/docs/`
- Esquema OpenAPI: `docs/openapi.yaml`
- Arquitectura backend: `docs/arquitectura.md`
- Frontend: `frontend/README.md`
- PLE SUNAT: `docs/ple.md`
- API: `docs/api.md`

## Pruebas

```bash
cd backend
.venv/bin/pytest
.venv/bin/ruff check .
```

Las pruebas usan PostgreSQL, no SQLite, porque el modelo depende de `jsonb`,
restricciones únicas con `NULL` y bloqueos `FOR UPDATE`.

Frontend:

```bash
cd frontend
npm run lint
npm test
npm run build
```

## Multiempresa

Todas las peticiones autenticadas deben enviar:

```http
X-Empresa-ID: <uuid-de-la-empresa>
Authorization: Bearer <access-token>
```

Si el usuario solo tiene una empresa activa, el header es opcional. Si tiene
varias, es obligatorio. El rol se valida contra `core.UsuarioEmpresa`.

## Estructura

```text
backend/
  apps/
    common/        utilidades, permisos, excepciones
    core/          usuarios, empresas, tablas SUNAT, secuencias, cierre
    almacenes/     almacenes y ubicaciones
    catalogo/      categorías, productos, lotes y series
    inventario/    stock, reservas y saldos por periodo
    movimientos/   borradores, confirmación y anulación
    kardex/        valuación PP/FIFO y kardex inmutable
    sunat_ple/     generador y validador 12.1/13.1
    integraciones/ contrato para ventas/compras
  tests/
frontend/          React + TypeScript + Vite + Tailwind
docs/
```

## Flujo de inventario

1. Se crea un movimiento en `BORRADOR`.
2. Se confirma con `POST /api/v1/movimientos/{id}/confirmar/`.
3. El motor bloquea el saldo del producto/almacén y aplica Promedio Ponderado o
   FIFO según el producto.
4. Se actualiza el stock físico y se inserta una fila inmutable en
   `kardex_valorizado`.
5. Una anulación genera un contra-movimiento; nunca modifica el kardex.

No se permiten fechas anteriores al último kardex del producto ni movimientos
en periodos cerrados.
