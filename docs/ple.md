# PLE SUNAT 12.1 y 13.1

## Estructura oficial usada

La implementación sigue la estructura publicada por SUNAT en “Estructura del
PLE” y el Anexo 3 de tablas.

### Libro 12.1

19 campos obligatorios + campos libres 20-40:

1. Periodo `AAAAMM00`
2. CUO
3. Correlativo del asiento (`A`, `M` o `C` + hasta 9 caracteres)
4. Establecimiento anexo (4 a 7 dígitos)
5. Catálogo de existencia (Tabla 13)
6. Tipo de existencia (Tabla 5)
7. Código propio (hasta 24)
8. Catálogo internacional (1 o 3; opcional)
9. Código internacional (hasta 128; opcional)
10. Fecha de emisión `DD/MM/AAAA`
11. Tipo de comprobante (Tabla 10)
12. Serie
13. Número
14. Tipo de operación (Tabla 12)
15. Descripción (hasta 80)
16. Unidad de medida (Tabla 6)
17. Entradas (2 decimales; incluye saldo inicial)
18. Salidas (2 decimales; **negativas**)
19. Estado de operación (`1`, `8`, `9`)

### Libro 13.1

27 campos obligatorios + campos libres 28-56. Los campos 1-16 son iguales a
12.1, luego:

17. Método de valuación (Tabla 14)
18. Cantidad de entrada (8 decimales)
19. Costo unitario de entrada (8 decimales)
20. Costo total de entrada (2 decimales)
21. Cantidad de salida (8 decimales; **negativa**)
22. Costo unitario de salida (8 decimales; positivo)
23. Costo total de salida (2 decimales; **negativo**)
24. Cantidad de saldo (8 decimales)
25. Costo unitario de saldo (8 decimales)
26. Costo total de saldo (2 decimales)
27. Estado de operación (`1`, `8`, `9`)

La primera fila de cada producto/establecimiento en el periodo es el saldo
inicial, con tipo de operación `16`. El exportador lo calcula desde el kardex
anterior y lo guarda en `inventario_saldo_periodo`.

## Nombre del archivo

Máscara de 33 caracteres antes de `.TXT`:

```text
LE + RUC(11) + AAAAMM + DD(00) + LLLLLL + CC(00) + O + I + M + G + .TXT
```

- `LLLLLL`: `120100` para 12.1, `130100` para 13.1.
- `O`: indicador de operaciones (1 empresa operativa).
- `I`: 1 con información, 0 sin información.
- `M`: 1 soles, 2 dólares.
- `G`: 1 generado por PLE.

## Reglas implementadas

- Fechas dentro del periodo.
- Operaciones 01-06 exigen comprobante distinto de `00`, serie y número.
- Catálogo internacional 8 no admite `9`.
- Descripción sin `|`, `/` ni `\`.
- Salidas negativas en 12.1 y 13.1.
- Coherencia aritmética de cantidades y costos.
- Saldo acumulado por establecimiento/catálogo/tipo/código.
- Validación previa antes de descargar; si hay errores se devuelve HTTP 422.

## Codificación

La estructura no fija una codificación única en el documento de campos. El
proyecto usa `UTF-8` por defecto y permite cambiarla con `PLE_ENCODING`
(por ejemplo, `cp1252`) para calibrar contra el validador PLE.

## Fuentes

- SUNAT, “Estructura de los Libros y Registros Electrónicos en el PLE”:
  https://www.gob.pe/institucion/sunat/informes-publicaciones/356712-estructura-de-los-libros-y-registros-electronicos-en-el-ple
- SUNAT, Anexo 3 de tablas:
  https://www.sunat.gob.pe/orientacion/amazon/ple/PLEAnexo3TABLASfinal.xls

Antes de producción se recomienda validar el `.TXT` en el aplicativo PLE
vigente y, si se consigue un archivo aceptado, incorporarlo como golden test.
