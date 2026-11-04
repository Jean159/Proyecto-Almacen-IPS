# API v1

Base: `/api/v1/`

## Autenticación

```http
POST /api/v1/auth/login/
Content-Type: application/json

{"email": "admin@demo.pe", "password": "admin12345"}
```

Respuesta: `access`, `refresh`, `usuario`, `empresas`.

Enviar en las demás peticiones:

```http
Authorization: Bearer <access>
X-Empresa-ID: <uuid>
```

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login/` | Login JWT |
| POST | `/auth/refresh/` | Renovar access token |
| GET | `/auth/me/` | Usuario y empresas |
| GET | `/empresas/` | Empresas del usuario |
| GET | `/dashboard/kpis/` | Indicadores del inventario |
| CRUD | `/almacenes/` | Almacenes |
| CRUD | `/ubicaciones/` | Ubicaciones físicas |
| CRUD | `/categorias/` | Categorías |
| CRUD | `/productos/` | Productos |
| CRUD | `/lotes/` | Lotes y series |
| GET | `/stock/` | Stock por almacén/ubicación/lote |
| GET | `/stock/resumen/` | Stock agregado y valorizado |
| GET | `/stock/alertas/` | Bajo mínimo y por vencer |
| CRUD | `/reservas/` | Reservas de stock |
| GET | `/saldos-periodo/` | Snapshots de inicio de periodo |
| CRUD | `/movimientos/` | Borradores y consulta |
| POST | `/movimientos/{id}/confirmar/` | Confirmar (idempotente) |
| POST | `/movimientos/{id}/anular/` | Anular con contra-movimiento |
| GET | `/movimientos/{id}/eventos/` | Auditoría del movimiento |
| GET | `/kardex/` | Kardex valorizado |
| GET | `/kardex/fisico/` | Kardex en unidades físicas |
| GET | `/kardex/export/` | Exportar Excel |
| GET | `/saldos-kardex/` | Saldo actual por producto/almacén |
| GET | `/sunat/tablas/{numero}/` | Tablas SUNAT |
| GET | `/ple/preview/` | Previsualizar y validar PLE |
| GET | `/ple/descargar/` | Descargar `.TXT` |
| GET | `/ple/validar/` | Validar sin descargar |
| GET | `/ple/historial/` | Exportaciones generadas |
| CRUD | `/cierres-periodo/` | Cierre de periodos |

## Confirmación

```http
POST /api/v1/movimientos/{id}/confirmar/
Idempotency-Key: venta-2026-0001
```

La operación es atómica. Si el stock es insuficiente devuelve `409` con
`codigo: "stock_insuficiente"`. Si el periodo está cerrado devuelve `409` con
`codigo: "periodo_cerrado"`.

## PLE

```http
GET /api/v1/ple/preview/?libro=13.1&anio=2026&mes=11
GET /api/v1/ple/descargar/?libro=13.1&anio=2026&mes=11
```

`preview` devuelve las líneas y los errores de validación. `descargar` devuelve
el archivo con `Content-Disposition`; si hay errores devuelve `422` y no genera
archivo.
