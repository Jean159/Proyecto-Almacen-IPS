"""Motor de valuación de inventario: Promedio Ponderado y FIFO."""

from dataclasses import dataclass
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.common.exceptions import StockInsuficiente
from apps.common.utils import redondear, sanitizar_texto_ple
from apps.inventario.models import StockSaldo
from apps.kardex.models import CapaCosto, ConsumoCapa, KardexValorizado, SaldoKardex
from apps.movimientos.models import MovimientoDetalle, MovimientoInventario


@dataclass
class ResultadoValor:
    costo_unitario: Decimal
    costo_total: Decimal
    kardex: KardexValorizado


class KardexValuationEngine:
    """Aplica un movimiento confirmado sobre el stock y el kardex."""

    @classmethod
    def procesar(cls, movimiento: MovimientoInventario, detalle: MovimientoDetalle):
        if movimiento.tipo_movimiento == MovimientoInventario.Tipo.TRANSFERENCIA:
            return cls._procesar_transferencia(movimiento, detalle)
        if movimiento.tipo_movimiento == MovimientoInventario.Tipo.AJUSTE:
            if movimiento.direccion_ajuste == MovimientoInventario.DireccionAjuste.ENTRADA:
                return cls._procesar_entrada(movimiento, detalle)
            return cls._procesar_salida(movimiento, detalle)
        if movimiento.tipo_movimiento == MovimientoInventario.Tipo.ENTRADA:
            return cls._procesar_entrada(movimiento, detalle)
        return cls._procesar_salida(movimiento, detalle)

    # ------------------------------------------------------------------
    # Entradas
    # ------------------------------------------------------------------
    @classmethod
    def _procesar_entrada(
        cls,
        movimiento: MovimientoInventario,
        detalle: MovimientoDetalle,
        *,
        almacen=None,
        ubicacion=None,
        lote=None,
        costo_unitario: Decimal | None = None,
        costo_total: Decimal | None = None,
        tipo_operacion: str | None = None,
    ) -> ResultadoValor:
        almacen = almacen or movimiento.almacen
        ubicacion = ubicacion if ubicacion is not None else detalle.ubicacion
        lote = lote if lote is not None else detalle.lote_serie
        saldo = cls._obtener_saldo(almacen, detalle.producto)

        if costo_unitario is None:
            costo_unitario, costo_total = cls._costo_entrada(detalle)
        else:
            costo_unitario = Decimal(costo_unitario)
            costo_total = (
                redondear(costo_total, 2)
                if costo_total is not None
                else redondear(detalle.cantidad * costo_unitario, 2)
            )

        detalle.costo_unitario = costo_unitario
        detalle.costo_total = costo_total
        detalle.save(update_fields=["costo_unitario", "costo_total"])

        saldo.cantidad += detalle.cantidad
        saldo.costo_total += costo_total
        saldo.costo_unitario = (
            (saldo.costo_total / saldo.cantidad).quantize(Decimal("0.00000001"))
            if saldo.cantidad > 0
            else Decimal("0")
        )
        saldo.ultima_secuencia += 1
        saldo.save(
            update_fields=[
                "cantidad",
                "costo_total",
                "costo_unitario",
                "ultima_secuencia",
                "actualizado_en",
            ]
        )

        kardex = cls._crear_kardex(
            movimiento=movimiento,
            detalle=detalle,
            almacen=almacen,
            lado=KardexValorizado.Lado.ENTRADA,
            secuencia=saldo.ultima_secuencia,
            tipo_operacion=tipo_operacion or movimiento.tipo_operacion_sunat,
            cantidad_entrada=detalle.cantidad,
            costo_unitario_entrada=costo_unitario,
            costo_total_entrada=costo_total,
            saldo=saldo,
        )

        if detalle.producto.metodo_valuacion == "2":
            CapaCosto.objects.create(
                empresa=movimiento.empresa,
                almacen=almacen,
                producto=detalle.producto,
                lote_serie=lote,
                movimiento_detalle=detalle,
                fecha_operacion=movimiento.fecha_operacion,
                costo_unitario=costo_unitario,
                cantidad_inicial=detalle.cantidad,
                cantidad_disponible=detalle.cantidad,
                secuencia=kardex.secuencia,
            )

        cls._actualizar_stock(
            almacen=almacen,
            producto=detalle.producto,
            ubicacion=ubicacion,
            lote=lote,
            cantidad=detalle.cantidad,
            entrada=True,
        )
        return ResultadoValor(costo_unitario, costo_total, kardex)

    # ------------------------------------------------------------------
    # Salidas
    # ------------------------------------------------------------------
    @classmethod
    def _procesar_salida(
        cls,
        movimiento: MovimientoInventario,
        detalle: MovimientoDetalle,
        *,
        almacen=None,
        ubicacion=None,
        lote=None,
        tipo_operacion: str | None = None,
        costo_forzado: Decimal | None = None,
    ) -> ResultadoValor:
        almacen = almacen or movimiento.almacen
        ubicacion = ubicacion if ubicacion is not None else detalle.ubicacion
        lote = lote if lote is not None else detalle.lote_serie
        saldo = cls._obtener_saldo(almacen, detalle.producto)

        if saldo.cantidad < detalle.cantidad:
            raise StockInsuficiente(
                f"Saldo insuficiente de {detalle.producto.sku} en {almacen.codigo}. "
                f"Disponible: {saldo.cantidad}, solicitado: {detalle.cantidad}."
            )

        consumos = []
        if costo_forzado is not None:
            costo_unitario = Decimal(costo_forzado)
            costo_total = redondear(detalle.cantidad * costo_unitario, 2)
            if costo_total > saldo.costo_total:
                costo_total = saldo.costo_total
                costo_unitario = (
                    (costo_total / detalle.cantidad).quantize(Decimal("0.00000001"))
                    if detalle.cantidad > 0
                    else Decimal("0")
                )
        elif detalle.producto.metodo_valuacion == "2":
            costo_unitario, costo_total, consumos = cls._consumir_fifo(
                almacen, detalle.producto, detalle.cantidad, lote=lote
            )
        else:
            costo_unitario = saldo.costo_unitario
            if detalle.cantidad == saldo.cantidad:
                costo_total = saldo.costo_total
                costo_unitario = (
                    (costo_total / detalle.cantidad).quantize(Decimal("0.00000001"))
                    if detalle.cantidad > 0
                    else Decimal("0")
                )
            else:
                costo_total = redondear(detalle.cantidad * costo_unitario, 2)

        if costo_total > saldo.costo_total:
            costo_total = saldo.costo_total
            costo_unitario = (
                (costo_total / detalle.cantidad).quantize(Decimal("0.00000001"))
                if detalle.cantidad > 0
                else Decimal("0")
            )

        saldo.cantidad -= detalle.cantidad
        saldo.costo_total -= costo_total
        if saldo.costo_total < 0:
            saldo.costo_total = Decimal("0")
        if saldo.cantidad <= 0:
            saldo.cantidad = Decimal("0")
            saldo.costo_total = Decimal("0")
            saldo.costo_unitario = Decimal("0")
        else:
            saldo.costo_unitario = (
                (saldo.costo_total / saldo.cantidad).quantize(Decimal("0.00000001"))
                if saldo.costo_total > 0
                else Decimal("0")
            )
        saldo.ultima_secuencia += 1
        saldo.save(
            update_fields=[
                "cantidad",
                "costo_total",
                "costo_unitario",
                "ultima_secuencia",
                "actualizado_en",
            ]
        )

        detalle.costo_unitario = costo_unitario
        detalle.costo_total = costo_total
        detalle.save(update_fields=["costo_unitario", "costo_total"])

        kardex = cls._crear_kardex(
            movimiento=movimiento,
            detalle=detalle,
            almacen=almacen,
            lado=KardexValorizado.Lado.SALIDA,
            secuencia=saldo.ultima_secuencia,
            tipo_operacion=tipo_operacion or movimiento.tipo_operacion_sunat,
            cantidad_salida=detalle.cantidad,
            costo_unitario_salida=costo_unitario,
            costo_total_salida=costo_total,
            saldo=saldo,
        )

        for capa, cantidad, unitario, total in consumos:
            ConsumoCapa.objects.create(
                capa=capa,
                kardex=kardex,
                cantidad=cantidad,
                costo_unitario=unitario,
                costo_total=total,
            )

        cls._actualizar_stock(
            almacen=almacen,
            producto=detalle.producto,
            ubicacion=ubicacion,
            lote=lote,
            cantidad=detalle.cantidad,
            entrada=False,
        )
        return ResultadoValor(costo_unitario, costo_total, kardex)

    # ------------------------------------------------------------------
    # Transferencias y ajustes
    # ------------------------------------------------------------------
    @classmethod
    def _procesar_transferencia(
        cls, movimiento: MovimientoInventario, detalle: MovimientoDetalle
    ) -> ResultadoValor:
        if not movimiento.almacen_destino_id:
            raise ValidationError("La transferencia requiere almacén destino.")

        salida = cls._procesar_salida(
            movimiento,
            detalle,
            almacen=movimiento.almacen,
            ubicacion=detalle.ubicacion,
            lote=detalle.lote_serie,
            tipo_operacion="11",
        )
        entrada = cls._procesar_entrada(
            movimiento,
            detalle,
            almacen=movimiento.almacen_destino,
            ubicacion=detalle.ubicacion_destino,
            lote=detalle.lote_serie,
            costo_unitario=salida.costo_unitario,
            costo_total=salida.costo_total,
            tipo_operacion="21",
        )
        return entrada

    # ------------------------------------------------------------------
    # Cálculos auxiliares
    # ------------------------------------------------------------------
    @classmethod
    def _costo_entrada(cls, detalle: MovimientoDetalle):
        cantidad = detalle.cantidad
        unitario = Decimal(detalle.costo_unitario or 0)
        total = Decimal(detalle.costo_total or 0)
        if unitario > 0:
            total = redondear(cantidad * unitario, 2)
        elif total > 0:
            unitario = (total / cantidad).quantize(Decimal("0.00000001"))
        else:
            raise ValidationError(
                {
                    "detalles": (
                        f"Debe indicar el costo unitario o total de entrada para "
                        f"{detalle.producto.sku}."
                    )
                }
            )
        return unitario, total

    @classmethod
    def _consumir_fifo(cls, almacen, producto, cantidad: Decimal, lote=None):
        capas_qs = CapaCosto.objects.select_for_update().filter(
            almacen=almacen,
            producto=producto,
            cantidad_disponible__gt=0,
        )
        if lote:
            capas_qs = capas_qs.filter(lote_serie=lote)
        capas = list(capas_qs.order_by("fecha_operacion", "secuencia", "creado_en", "id"))
        disponible = sum((c.cantidad_disponible for c in capas), Decimal("0"))
        if disponible < cantidad:
            raise StockInsuficiente(
                f"Capas FIFO insuficientes de {producto.sku}. "
                f"Disponible: {disponible}, solicitado: {cantidad}."
            )

        restante = cantidad
        total = Decimal("0")
        consumos = []
        for capa in capas:
            if restante <= 0:
                break
            tomar = min(capa.cantidad_disponible, restante)
            if tomar <= 0:
                continue
            importe = redondear(tomar * capa.costo_unitario, 2)
            total += importe
            capa.cantidad_disponible -= tomar
            capa.save(update_fields=["cantidad_disponible", "actualizado_en"])
            consumos.append((capa, tomar, capa.costo_unitario, importe))
            restante -= tomar

        unitario = (
            (total / cantidad).quantize(Decimal("0.00000001")) if cantidad > 0 else Decimal("0")
        )
        return unitario, total, consumos

    @classmethod
    def _obtener_saldo(cls, almacen, producto) -> SaldoKardex:
        for _ in range(5):
            try:
                with transaction.atomic():
                    saldo, _ = SaldoKardex.objects.get_or_create(
                        empresa=almacen.empresa,
                        almacen=almacen,
                        producto=producto,
                    )
                    return SaldoKardex.objects.select_for_update().get(pk=saldo.pk)
            except IntegrityError:
                continue
        raise ValidationError("No se pudo bloquear el saldo de kardex.")

    @classmethod
    def _actualizar_stock(cls, *, almacen, producto, ubicacion, lote, cantidad, entrada: bool):
        for _ in range(5):
            try:
                with transaction.atomic():
                    fila, _ = StockSaldo.objects.get_or_create(
                        almacen=almacen,
                        producto=producto,
                        ubicacion=ubicacion,
                        lote_serie=lote,
                    )
                    fila = StockSaldo.objects.select_for_update().get(pk=fila.pk)
                    if entrada:
                        fila.cantidad_fisica += cantidad
                    else:
                        if fila.cantidad_disponible < cantidad:
                            raise StockInsuficiente(
                                f"Stock insuficiente en la ubicación/lote de "
                                f"{producto.sku}. Disponible: {fila.cantidad_disponible}, "
                                f"solicitado: {cantidad}."
                            )
                        fila.cantidad_fisica -= cantidad
                    fila.save(update_fields=["cantidad_fisica", "ultima_actualizacion"])
                    return fila
            except IntegrityError:
                continue
        raise ValidationError("No se pudo bloquear el stock físico.")

    @classmethod
    def _crear_kardex(
        cls,
        *,
        movimiento,
        detalle,
        almacen,
        lado,
        secuencia,
        tipo_operacion,
        cantidad_entrada=Decimal("0"),
        costo_unitario_entrada=Decimal("0"),
        costo_total_entrada=Decimal("0"),
        cantidad_salida=Decimal("0"),
        costo_unitario_salida=Decimal("0"),
        costo_total_salida=Decimal("0"),
        saldo,
    ) -> KardexValorizado:
        producto = detalle.producto
        return KardexValorizado.objects.create(
            empresa=movimiento.empresa,
            almacen=almacen,
            producto=producto,
            movimiento_detalle=detalle,
            lado=lado,
            secuencia=secuencia,
            periodo_aaaamm=movimiento.fecha_operacion.strftime("%Y%m"),
            fecha_operacion=movimiento.fecha_operacion,
            tipo_operacion=tipo_operacion,
            establecimiento_anexo=almacen.codigo_sunat,
            catalogo_tipo=producto.catalogo_tipo,
            tipo_existencia=producto.tipo_existencia,
            codigo_propio_sunat=producto.codigo_propio_sunat,
            catalogo_internacional=producto.catalogo_internacional,
            codigo_internacional=producto.codigo_internacional,
            descripcion_producto=sanitizar_texto_ple(producto.descripcion, 80),
            unidad_medida=producto.unidad_medida,
            metodo_valuacion=producto.metodo_valuacion,
            fecha_documento=movimiento.fecha_documento or movimiento.fecha_operacion,
            tipo_comprobante=movimiento.tipo_comprobante_sunat,
            serie_comprobante=movimiento.serie_comprobante or "0",
            numero_comprobante=movimiento.numero_comprobante or "0",
            cuo_contable=movimiento.cuo_contable,
            correlativo_asiento=movimiento.correlativo_asiento or "M1",
            estado_sunat=movimiento.estado_sunat,
            glosa=sanitizar_texto_ple(movimiento.glosa, 200),
            cantidad_entrada=cantidad_entrada,
            costo_unitario_entrada=costo_unitario_entrada,
            costo_total_entrada=costo_total_entrada,
            cantidad_salida=cantidad_salida,
            costo_unitario_salida=costo_unitario_salida,
            costo_total_salida=costo_total_salida,
            cantidad_saldo=saldo.cantidad,
            costo_unitario_saldo=saldo.costo_unitario,
            costo_total_saldo=saldo.costo_total,
        )
