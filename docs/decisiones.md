# Decisiones de arquitectura

## ADR-001: una sola base con `empresa_id`

Se usa *shared schema* en lugar de una base por empresa. Simplifica migraciones
y despliegues; el aislamiento se garantiza con `UsuarioEmpresa`, el header
`X-Empresa-ID` y querysets filtrados.

## ADR-002: Promedio Ponderado y FIFO

El método se define por producto. El motor usa estrategias y capas de costo
para FIFO. La identificación específica queda en el catálogo (código 5), pero
el motor v1 la rechaza con un mensaje explícito.

## ADR-003: bloqueo de retroactividad

Un movimiento no puede tener fecha anterior al último kardex del
producto/almacén. Esto evita recalcular todos los saldos posteriores y mantiene
el kardex consistente. La fecha del movimiento se ordena por `secuencia`, no
solo por fecha.

## ADR-004: kardex append-only

El kardex es un libro auxiliar inmutable. Se protege en el modelo y con un
trigger de PostgreSQL. Las anulaciones generan un contra-movimiento.

## ADR-005: snapshots para PLE

Los campos que exige SUNAT se copian al kardex al confirmar el movimiento. Si
mañana cambia la descripción, el código o el método del producto, los archivos
históricos siguen siendo reproducibles.

## ADR-006: PLE basado en la estructura oficial

Se implementan 19 campos para 12.1 y 27 para 13.1, con salidas negativas y
saldo inicial. La codificación es configurable. El validador previo bloquea la
descarga si detecta inconsistencias.
