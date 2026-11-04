"""Creación, confirmación y anulación de movimientos de inventario."""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.utils import timezone

from apps.common.exceptions import (
    MovimientoInvalido,
    PeriodoCerrado,
    RetroactividadNoPermitida,
    StockInsuficiente,
)
from apps.core.models import CierrePeriodo, Secuencia
from apps.core.sunat import OPERACIONES_CON_COMPROBANTE
from apps.inventario.models import StockSaldo
from apps.kardex.models import KardexValorizado
from apps.kardex.services import KardexValuationEngine
from apps.movimientos.models import (
    EventoMovimiento,
    MovimientoDetalle,
    MovimientoInventario,
)

PREFIJOS = {
    "ENTRADA": "E",
    "SALIDA": "S",
    "TRANSFERENCIA": "T",
    "AJUSTE": "A",
}


def _siguiente_secuencia(empresa, tipo: str, anio: int) -> int:
    for _ in range(5):
        try:
            with transaction.atomic():
                secuencia, _ = Secuencia.objects.get_or_create(
                    empresa=empresa, tipo=tipo, anio=anio
                )
                secuencia = Secuencia.objects.select_for_update().get(pk=secuencia.pk)
                secuencia.ultimo += 1
                secuencia.save(update_fields=["ultimo", "actualizado_en"])
                return secuencia.ultimo
        except IntegrityError:
            continue
    raise ValidationError("No se pudo generar la secuencia del movimiento.")


def _generar_correlativo(empresa, tipo: str, anio: int) -> str:
    numero = _siguiente_secuencia(empresa, f"MOV-{tipo}", anio)
    return f"{PREFIJOS.get(tipo, 'M')}-{anio}-{numero:08d}"


def _generar_cuo(empresa, anio: int) -> str:
    numero = _siguiente_secuencia(empresa, "CUO", anio)
    return f"CUO-{empresa.ruc}-{numero:08d}"


class MovimientoService:
    @classmethod
    @transaction.atomic
    def crear_borrador(cls, empresa, usuario, data: dict) -> MovimientoInventario:
        detalles = data.pop("detalles", [])
        if not detalles:
            raise ValidationError({"detalles": "Debe registrar al menos un detalle."})

        tipo = data.get("tipo_movimiento")
        if tipo not in dict(MovimientoInventario.Tipo.choices):
            raise ValidationError({"tipo_movimiento": "Tipo de movimiento inválido."})

        almacen = data.get("almacen")
        if not almacen or almacen.empresa_id != empresa.id:
            raise ValidationError({"almacen": "Almacén inválido para la empresa."})

        almacen_destino = data.get("almacen_destino")
        if tipo == MovimientoInventario.Tipo.TRANSFERENCIA:
            if not almacen_destino or almacen_destino.empresa_id != empresa.id:
                raise ValidationError(
                    {"almacen_destino": "La transferencia requiere almacén destino."}
                )
            if almacen_destino.pk == almacen.pk:
                raise ValidationError({"almacen_destino": "El almacén destino debe ser distinto."})
        else:
            almacen_destino = None

        fecha_operacion = data.get("fecha_operacion") or timezone.localdate()
        if fecha_operacion > timezone.localdate():
            raise ValidationError({"fecha_operacion": "No se permiten fechas futuras."})

        operacion = data.get("tipo_operacion_sunat")
        if not operacion:
            operacion = {
                "ENTRADA": "02",
                "SALIDA": "01",
                "TRANSFERENCIA": "11",
                "AJUSTE": "28",
            }[tipo]

        direccion = data.get("direccion_ajuste", "")
        if tipo == MovimientoInventario.Tipo.AJUSTE:
            if direccion not in (
                MovimientoInventario.DireccionAjuste.ENTRADA,
                MovimientoInventario.DireccionAjuste.SALIDA,
            ):
                raise ValidationError(
                    {"direccion_ajuste": "El ajuste requiere dirección ENTRADA o SALIDA."}
                )
        else:
            direccion = ""

        movimiento = MovimientoInventario.objects.create(
            empresa=empresa,
            correlativo_interno=_generar_correlativo(empresa, tipo, fecha_operacion.year),
            tipo_movimiento=tipo,
            direccion_ajuste=direccion,
            tipo_operacion_sunat=operacion,
            tipo_comprobante_sunat=data.get("tipo_comprobante_sunat", "00"),
            serie_comprobante=data.get("serie_comprobante", "0") or "0",
            numero_comprobante=data.get("numero_comprobante", "0") or "0",
            fecha_operacion=fecha_operacion,
            fecha_documento=data.get("fecha_documento"),
            almacen=almacen,
            almacen_destino=almacen_destino,
            cuo_contable=data.get("cuo_contable", ""),
            correlativo_asiento=data.get("correlativo_asiento", "M1") or "M1",
            estado_sunat=data.get("estado_sunat", "1"),
            glosa=data.get("glosa", ""),
            estado=MovimientoInventario.Estado.BORRADOR,
            idempotency_key=data.get("idempotency_key", "") or "",
            external_id=data.get("external_id", "") or "",
            usuario_registro=usuario,
        )
        cls._aplicar_detalles(movimiento, detalles)
        EventoMovimiento.objects.create(movimiento=movimiento, accion="CREADO", usuario=usuario)
        return movimiento

    @classmethod
    @transaction.atomic
    def actualizar_borrador(
        cls, movimiento: MovimientoInventario, usuario, data: dict
    ) -> MovimientoInventario:
        movimiento = MovimientoInventario.objects.select_for_update().get(pk=movimiento.pk)
        if movimiento.estado != MovimientoInventario.Estado.BORRADOR:
            raise MovimientoInvalido("Solo se puede editar un movimiento en borrador.")

        detalles = data.pop("detalles", None)
        tipo_anterior = movimiento.tipo_movimiento
        for campo in (
            "tipo_movimiento",
            "direccion_ajuste",
            "tipo_operacion_sunat",
            "tipo_comprobante_sunat",
            "serie_comprobante",
            "numero_comprobante",
            "fecha_operacion",
            "fecha_documento",
            "almacen",
            "almacen_destino",
            "glosa",
            "external_id",
            "estado_sunat",
            "correlativo_asiento",
        ):
            if campo in data:
                setattr(movimiento, campo, data[campo])

        if movimiento.almacen.empresa_id != movimiento.empresa_id:
            raise ValidationError({"almacen": "Almacén inválido para la empresa."})
        if movimiento.tipo_movimiento == MovimientoInventario.Tipo.TRANSFERENCIA:
            if (
                not movimiento.almacen_destino
                or movimiento.almacen_destino.empresa_id != movimiento.empresa_id
                or movimiento.almacen_destino_id == movimiento.almacen_id
            ):
                raise ValidationError(
                    {"almacen_destino": "La transferencia requiere almacén destino distinto."}
                )
        else:
            movimiento.almacen_destino = None

        if movimiento.tipo_movimiento == MovimientoInventario.Tipo.AJUSTE:
            if movimiento.direccion_ajuste not in (
                MovimientoInventario.DireccionAjuste.ENTRADA,
                MovimientoInventario.DireccionAjuste.SALIDA,
            ):
                raise ValidationError(
                    {"direccion_ajuste": "El ajuste requiere dirección ENTRADA o SALIDA."}
                )
        else:
            movimiento.direccion_ajuste = ""

        if movimiento.tipo_movimiento != tipo_anterior:
            movimiento.correlativo_interno = _generar_correlativo(
                movimiento.empresa,
                movimiento.tipo_movimiento,
                movimiento.fecha_operacion.year,
            )
        if movimiento.fecha_operacion > timezone.localdate():
            raise ValidationError({"fecha_operacion": "No se permiten fechas futuras."})

        movimiento.save()
        if detalles is not None:
            if not detalles:
                raise ValidationError({"detalles": "Debe registrar al menos un detalle."})
            movimiento.detalles.all().delete()
            cls._aplicar_detalles(movimiento, detalles)
        EventoMovimiento.objects.create(movimiento=movimiento, accion="EDITADO", usuario=usuario)
        return movimiento

    @classmethod
    def _aplicar_detalles(cls, movimiento, detalles):
        for item in detalles:
            producto = item.get("producto")
            if not producto or producto.empresa_id != movimiento.empresa_id:
                raise ValidationError({"detalles": "Producto inválido para la empresa."})
            cls._validar_detalle(movimiento, producto, item)
            MovimientoDetalle.objects.create(
                movimiento=movimiento,
                producto=producto,
                ubicacion=item.get("ubicacion"),
                ubicacion_destino=item.get("ubicacion_destino"),
                lote_serie=item.get("lote_serie"),
                cantidad=item["cantidad"],
                costo_unitario=item.get("costo_unitario", 0),
                costo_total=item.get("costo_total", 0),
            )

    @classmethod
    def _validar_detalle(cls, movimiento, producto, item):
        cantidad = item.get("cantidad")
        if not cantidad or cantidad <= 0:
            raise ValidationError({"detalles": "La cantidad debe ser mayor a cero."})
        if producto.metodo_valuacion == "5":
            raise ValidationError(
                {
                    "detalles": (
                        f"{producto.sku} usa identificación específica; "
                        "el motor v1 solo implementa promedio ponderado y FIFO."
                    )
                }
            )
        ubicacion = item.get("ubicacion")
        ubicacion_destino = item.get("ubicacion_destino")
        lote = item.get("lote_serie")
        if ubicacion and ubicacion.almacen_id != movimiento.almacen_id:
            raise ValidationError({"detalles": "La ubicación no es del almacén."})
        if movimiento.tipo_movimiento == MovimientoInventario.Tipo.TRANSFERENCIA:
            if ubicacion_destino and ubicacion_destino.almacen_id != movimiento.almacen_destino_id:
                raise ValidationError(
                    {"detalles": "La ubicación destino no es del almacén destino."}
                )
        elif ubicacion_destino:
            raise ValidationError({"detalles": "Solo las transferencias usan ubicación destino."})
        if lote and lote.producto_id != producto.id:
            raise ValidationError({"detalles": "El lote no corresponde al producto."})
        if producto.control_lotes and not lote:
            raise ValidationError({"detalles": f"{producto.sku} requiere lote o serie."})
        if producto.control_series:
            if not lote:
                raise ValidationError({"detalles": f"{producto.sku} requiere número de serie."})
            if cantidad != 1:
                raise ValidationError(
                    {"detalles": f"{producto.sku} controla series: cantidad debe ser 1."}
                )
        if producto.metodo_valuacion == "2" and lote is None and producto.control_lotes:
            raise ValidationError({"detalles": "El producto controla lotes."})

    @classmethod
    @transaction.atomic
    def confirmar(cls, movimiento, usuario, idempotency_key: str | None = None):
        movimiento = MovimientoInventario.objects.select_for_update().get(pk=movimiento.pk)
        if movimiento.estado == MovimientoInventario.Estado.CONFIRMADO:
            if idempotency_key and movimiento.idempotency_key not in ("", idempotency_key):
                raise MovimientoInvalido("La llave de idempotencia no coincide.")
            return movimiento
        if movimiento.estado == MovimientoInventario.Estado.ANULADO:
            raise MovimientoInvalido("El movimiento está anulado.")
        if not movimiento.detalles.exists():
            raise MovimientoInvalido("El movimiento no tiene detalles.")

        if idempotency_key:
            if movimiento.idempotency_key and movimiento.idempotency_key != idempotency_key:
                raise MovimientoInvalido("La llave de idempotencia no coincide.")
            movimiento.idempotency_key = idempotency_key

        if movimiento.fecha_operacion > timezone.localdate():
            raise ValidationError({"fecha_operacion": "No se permiten fechas futuras."})

        cls._validar_periodo(movimiento)
        cls._validar_documento(movimiento)
        cls._validar_detalles_confirmacion(movimiento)

        claves = cls._claves_saldo(movimiento)
        for almacen, producto in sorted(claves, key=lambda x: (str(x[0].pk), str(x[1].pk))):
            KardexValuationEngine._obtener_saldo(almacen, producto)

        for detalle in movimiento.detalles.all():
            cls._validar_retroactividad(movimiento, detalle)
            cls._validar_stock(movimiento, detalle)

        if not movimiento.cuo_contable:
            movimiento.cuo_contable = _generar_cuo(
                movimiento.empresa, movimiento.fecha_operacion.year
            )
        movimiento.estado = MovimientoInventario.Estado.CONFIRMADO
        movimiento.confirmado_por = usuario
        movimiento.confirmado_en = timezone.now()
        movimiento.save(
            update_fields=[
                "cuo_contable",
                "estado",
                "confirmado_por",
                "confirmado_en",
                "idempotency_key",
                "actualizado_en",
            ]
        )

        for detalle in movimiento.detalles.select_related("producto").all():
            KardexValuationEngine.procesar(movimiento, detalle)

        EventoMovimiento.objects.create(movimiento=movimiento, accion="CONFIRMADO", usuario=usuario)
        return movimiento

    @classmethod
    @transaction.atomic
    def anular(cls, movimiento, usuario):
        movimiento = MovimientoInventario.objects.select_for_update().get(pk=movimiento.pk)
        if movimiento.estado == MovimientoInventario.Estado.ANULADO:
            reverso = movimiento.reversos.filter(
                estado=MovimientoInventario.Estado.CONFIRMADO
            ).first()
            if reverso:
                return reverso
            raise MovimientoInvalido("El movimiento ya está anulado.")
        if movimiento.estado != MovimientoInventario.Estado.CONFIRMADO:
            raise MovimientoInvalido("Solo se puede anular un movimiento confirmado.")

        existente = movimiento.reversos.filter(
            estado=MovimientoInventario.Estado.CONFIRMADO
        ).first()
        if existente:
            return existente

        tipo_inverso = {
            MovimientoInventario.Tipo.ENTRADA: MovimientoInventario.Tipo.SALIDA,
            MovimientoInventario.Tipo.SALIDA: MovimientoInventario.Tipo.ENTRADA,
            MovimientoInventario.Tipo.TRANSFERENCIA: MovimientoInventario.Tipo.TRANSFERENCIA,
            MovimientoInventario.Tipo.AJUSTE: MovimientoInventario.Tipo.AJUSTE,
        }[movimiento.tipo_movimiento]

        direccion = ""
        if movimiento.tipo_movimiento == MovimientoInventario.Tipo.AJUSTE:
            direccion = (
                MovimientoInventario.DireccionAjuste.SALIDA
                if movimiento.direccion_ajuste == MovimientoInventario.DireccionAjuste.ENTRADA
                else MovimientoInventario.DireccionAjuste.ENTRADA
            )

        if movimiento.tipo_movimiento == MovimientoInventario.Tipo.TRANSFERENCIA:
            almacen = movimiento.almacen_destino
            almacen_destino = movimiento.almacen
        else:
            almacen = movimiento.almacen
            almacen_destino = None

        reverso = MovimientoInventario.objects.create(
            empresa=movimiento.empresa,
            correlativo_interno=_generar_correlativo(
                movimiento.empresa, tipo_inverso, timezone.localdate().year
            ),
            tipo_movimiento=tipo_inverso,
            direccion_ajuste=direccion,
            tipo_operacion_sunat="28",
            tipo_comprobante_sunat="00",
            serie_comprobante="0",
            numero_comprobante="0",
            fecha_operacion=timezone.localdate(),
            fecha_documento=None,
            almacen=almacen,
            almacen_destino=almacen_destino,
            glosa=f"Anulación de {movimiento.correlativo_interno}",
            estado=MovimientoInventario.Estado.BORRADOR,
            usuario_registro=usuario,
            movimiento_reverso_de=movimiento,
        )

        for detalle in movimiento.detalles.select_related("producto").all():
            if movimiento.tipo_movimiento == MovimientoInventario.Tipo.TRANSFERENCIA:
                ubicacion = detalle.ubicacion_destino
                ubicacion_destino = detalle.ubicacion
            else:
                ubicacion = detalle.ubicacion
                ubicacion_destino = detalle.ubicacion_destino
            MovimientoDetalle.objects.create(
                movimiento=reverso,
                producto=detalle.producto,
                ubicacion=ubicacion,
                ubicacion_destino=ubicacion_destino,
                lote_serie=detalle.lote_serie,
                cantidad=detalle.cantidad,
                costo_unitario=detalle.costo_unitario,
                costo_total=detalle.costo_total,
            )

        reverso = cls.confirmar(reverso, usuario)
        movimiento.estado = MovimientoInventario.Estado.ANULADO
        movimiento.anulado_por = usuario
        movimiento.anulado_en = timezone.now()
        movimiento.save(update_fields=["estado", "anulado_por", "anulado_en", "actualizado_en"])
        EventoMovimiento.objects.create(movimiento=movimiento, accion="ANULADO", usuario=usuario)
        return reverso

    # ------------------------------------------------------------------
    # Validaciones
    # ------------------------------------------------------------------
    @classmethod
    def _validar_periodo(cls, movimiento):
        if CierrePeriodo.objects.filter(
            empresa=movimiento.empresa,
            anio=movimiento.fecha_operacion.year,
            mes=movimiento.fecha_operacion.month,
            estado=CierrePeriodo.Estado.CERRADO,
        ).exists():
            raise PeriodoCerrado(f"El periodo {movimiento.fecha_operacion:%Y-%m} está cerrado.")

    @classmethod
    def _validar_documento(cls, movimiento):
        if movimiento.tipo_operacion_sunat in OPERACIONES_CON_COMPROBANTE:
            if movimiento.tipo_comprobante_sunat == "00":
                raise ValidationError(
                    {
                        "tipo_comprobante_sunat": (
                            "La operación exige un comprobante distinto de 00."
                        )
                    }
                )
            if movimiento.serie_comprobante in ("", "0") or movimiento.numero_comprobante in (
                "",
                "0",
            ):
                raise ValidationError(
                    {"serie_comprobante": ("La operación exige serie y número de comprobante.")}
                )

    @classmethod
    def _validar_detalles_confirmacion(cls, movimiento):
        for detalle in movimiento.detalles.select_related("producto").all():
            producto = detalle.producto
            if producto.empresa_id != movimiento.empresa_id:
                raise ValidationError({"detalles": "Producto de otra empresa."})
            if detalle.ubicacion and detalle.ubicacion.almacen_id != movimiento.almacen_id:
                raise ValidationError({"detalles": "Ubicación de otro almacén."})
            if (
                movimiento.tipo_movimiento == MovimientoInventario.Tipo.TRANSFERENCIA
                and detalle.ubicacion_destino
                and detalle.ubicacion_destino.almacen_id != movimiento.almacen_destino_id
            ):
                raise ValidationError({"detalles": "Ubicación destino inválida."})
            if detalle.lote_serie and detalle.lote_serie.producto_id != producto.id:
                raise ValidationError({"detalles": "Lote de otro producto."})
            if producto.control_lotes and not detalle.lote_serie:
                raise ValidationError({"detalles": f"{producto.sku} requiere lote o serie."})
            if producto.control_series and detalle.cantidad != 1:
                raise ValidationError(
                    {"detalles": f"{producto.sku} controla series: cantidad debe ser 1."}
                )

    @classmethod
    def _claves_saldo(cls, movimiento):
        claves = set()
        for detalle in movimiento.detalles.all():
            claves.add((movimiento.almacen, detalle.producto))
            if movimiento.tipo_movimiento == MovimientoInventario.Tipo.TRANSFERENCIA:
                claves.add((movimiento.almacen_destino, detalle.producto))
        return claves

    @classmethod
    def _validar_retroactividad(cls, movimiento, detalle):
        claves = [(movimiento.almacen, detalle.producto)]
        if movimiento.tipo_movimiento == MovimientoInventario.Tipo.TRANSFERENCIA:
            claves.append((movimiento.almacen_destino, detalle.producto))
        for almacen, producto in claves:
            ultimo = (
                KardexValorizado.objects.filter(
                    empresa=movimiento.empresa, almacen=almacen, producto=producto
                )
                .order_by("-fecha_operacion", "-secuencia")
                .first()
            )
            if ultimo and movimiento.fecha_operacion < ultimo.fecha_operacion:
                raise RetroactividadNoPermitida(
                    f"{producto.sku} en {almacen.codigo} tiene kardex hasta "
                    f"{ultimo.fecha_operacion}. No se permite retroceder la fecha."
                )

    @classmethod
    def _validar_stock(cls, movimiento, detalle):
        es_salida = (
            movimiento.tipo_movimiento == MovimientoInventario.Tipo.SALIDA
            or (
                movimiento.tipo_movimiento == MovimientoInventario.Tipo.AJUSTE
                and movimiento.direccion_ajuste == MovimientoInventario.DireccionAjuste.SALIDA
            )
            or movimiento.tipo_movimiento == MovimientoInventario.Tipo.TRANSFERENCIA
        )
        if not es_salida:
            return
        filas = StockSaldo.objects.filter(almacen=movimiento.almacen, producto=detalle.producto)
        if detalle.lote_serie:
            filas = filas.filter(lote_serie=detalle.lote_serie)
        if detalle.ubicacion:
            filas = filas.filter(ubicacion=detalle.ubicacion)
        agregado = filas.aggregate(
            fisica=Sum("cantidad_fisica"), reservada=Sum("cantidad_reservada")
        )
        fisica = agregado["fisica"] or Decimal("0")
        reservada = agregado["reservada"] or Decimal("0")
        disponible = fisica - reservada
        if disponible < detalle.cantidad:
            raise StockInsuficiente(
                f"Stock insuficiente de {detalle.producto.sku} en "
                f"{movimiento.almacen.codigo}. Disponible: {disponible}, "
                f"solicitado: {detalle.cantidad}."
            )
