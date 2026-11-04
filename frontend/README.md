# Frontend · ERP Almacén

Aplicación React para el módulo de almacén, inventario permanente y PLE SUNAT.

## Stack

- React 18 + TypeScript 5
- Vite 6
- Tailwind CSS 3 + Headless UI
- TanStack Query v5
- Zustand
- React Hook Form + Zod
- Axios + JWT
- Lucide React
- Vitest + React Testing Library

## Inicio

El backend debe estar corriendo en `http://127.0.0.1:8001`.

```bash
cd frontend
npm install
npm run dev
```

La aplicación queda en `http://127.0.0.1:5174`. Vite hace proxy de `/api` al
backend, por lo que no hace falta configurar CORS en desarrollo.

Credenciales demo:

- `admin@demo.pe`
- `admin12345`

## Scripts

```bash
npm run dev       # servidor de desarrollo
npm run build     # typecheck + build de producción
npm run lint      # ESLint
npm run test      # Vitest
npm run api:types # regenera src/types/api.ts desde docs/openapi.yaml
```

## Funcionalidad

- Login JWT, refresh de un solo vuelo y selector de empresa.
- Dashboard con KPIs, stock por almacén y actividad reciente.
- Almacenes, ubicaciones, categorías, productos y lotes/series.
- Stock en tiempo real, alertas de mínimo/vencimiento y reservas.
- Movimientos: wizard de entrada, salida, transferencia y ajuste; confirmación
  idempotente y anulación con contra-movimiento.
- Kardex valorizado 13.1 y físico 12.1, filtros y exportación Excel.
- Centro PLE: validación, errores por línea/campo, descarga e historial.
- Cierre y apertura de periodos.
- Roles: administrador, jefe de almacén, operador, consulta y auditor.

## Estructura

```text
src/
├── api/         clientes por recurso y descargas
├── components/  UI kit, layout y shared
├── features/    páginas por dominio
├── hooks/       auth, debounce, catálogos SUNAT
├── lib/         formato, errores, permisos, schemas, query keys
├── stores/      auth, empresa y UI
├── test/        setup de Vitest
└── types/       dominio + OpenAPI generado
```

## Seguridad y multiempresa

- Los tokens se guardan en `localStorage` para esta versión.
- Cada petición adjunta `Authorization` y `X-Empresa-ID`.
- Al cambiar de empresa se limpia la caché de TanStack Query.
- El backend sigue siendo la autoridad de permisos; el frontend oculta acciones
  según el rol.

## Notas

- El formato PLE se implementa según la estructura oficial publicada por SUNAT;
  antes de producción debe validarse en el aplicativo PLE vigente.
- La identificación específica, FEFO, transferencias en tránsito, multimoneda y
  conversión de presentaciones quedan para una siguiente fase.
- `src/types/api.ts` se genera desde `docs/openapi.yaml`; los tipos de dominio
  editables están en `src/types/domain.ts`.
