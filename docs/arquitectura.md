# Arquitectura del backend

## Capas

- `config/`: settings, URLs, WSGI/ASGI.
- `apps/common/`: modelos base, paginación, permisos y errores.
- `apps/core/`: usuario, empresa, membresía, tablas SUNAT, secuencias, cierre
  de periodo y auditoría.
- `apps/almacenes/`: almacenes y ubicaciones físicas.
- `apps/catalogo/`: categorías, productos, lotes y series.
- `apps/inventario/`: stock por almacén/ubicación/lote, reservas y snapshots
  por periodo.
- `apps/movimientos/`: ciclo de vida del movimiento y servicio transaccional.
- `apps/kardex/`: motor de valuación, saldos, capas FIFO y kardex inmutable.
- `apps/sunat_ple/`: exportador, validador y registro de exportaciones.
- `apps/integraciones/`: contrato para ventas, compras y distribución.

## Aislamiento multiempresa

El modelo es *shared schema*: todas las tablas de dominio tienen `empresa_id`
o acceden a ella mediante `almacen__empresa` / `producto__empresa`.

`core.UsuarioEmpresa` define el rol:

- `ADMIN`: todo.
- `JEFE`: catálogo, movimientos, anulación y PLE.
- `OPERADOR`: crea y confirma movimientos.
- `CONSULTA`: solo lectura.
- `AUDITOR`: lectura y PLE.

La empresa se resuelve desde `X-Empresa-ID`; si el usuario tiene una sola
membresía, se selecciona automáticamente. Los querysets se filtran siempre
por esa empresa.

## Concurrencia y valuación

La pieza central es `kardex.SaldoKardex`, una fila por
`empresa + almacén + producto`. La confirmación:

1. Abre una transacción.
2. Bloquea el movimiento.
3. Ordena y bloquea los saldos de todos los productos involucrados.
4. Valida stock, lote/serie, periodo y retroactividad.
5. Aplica el movimiento con `KardexValuationEngine`.
6. Inserta el kardex y actualiza el stock físico.

Promedio Ponderado usa el costo unitario del saldo. FIFO consume capas
(`CapaCosto`) de la más antigua a la más nueva y registra cada consumo en
`ConsumoCapa`.

Las transferencias generan dos filas de kardex: salida en origen y entrada en
destino, con el mismo costo. El lado destino se identifica con las operaciones
SUNAT 11 y 21.

## Inmutabilidad

`KardexValorizado` hereda de `AppendOnlyModel` y además tiene un trigger de
PostgreSQL que rechaza `UPDATE` y `DELETE`. Las correcciones se hacen con un
contra-movimiento.

## PLE

El exportador congela los datos que exige SUNAT al momento de confirmar el
movimiento: establecimiento, catálogo, tipo de existencia, código propio,
código internacional, descripción, unidad, método, documento y CUO. Un cambio
posterior en el maestro no altera el histórico.

El detalle del formato y las reglas implementadas están en `docs/ple.md`.
