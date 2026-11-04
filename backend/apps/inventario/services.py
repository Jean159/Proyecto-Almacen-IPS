from django.core.exceptions import ValidationError
from django.db import transaction

from apps.common.exceptions import StockInsuficiente
from apps.inventario.models import ReservaStock, StockSaldo


class ReservaService:
    @classmethod
    @transaction.atomic
    def crear(cls, empresa, usuario, data) -> ReservaStock:
        almacen = data["almacen"]
        producto = data["producto"]
        ubicacion = data.get("ubicacion")
        lote = data.get("lote_serie")
        cantidad = data["cantidad"]
        if almacen.empresa_id != empresa.id or producto.empresa_id != empresa.id:
            raise ValidationError("Almacén o producto de otra empresa.")
        filas = StockSaldo.objects.select_for_update().filter(almacen=almacen, producto=producto)
        if ubicacion:
            filas = filas.filter(ubicacion=ubicacion)
        if lote:
            filas = filas.filter(lote_serie=lote)
        filas = filas.order_by("creado_en", "id")
        fila = None
        for candidata in filas:
            if candidata.cantidad_disponible >= cantidad:
                fila = candidata
                break
        if not fila:
            disponible = sum((f.cantidad_disponible for f in filas), start=0)
            raise StockInsuficiente(
                f"No hay una ubicación/lote con stock suficiente para {producto.sku}. "
                f"Disponible máximo por fila: {disponible}."
            )
        fila.cantidad_reservada += cantidad
        fila.save(update_fields=["cantidad_reservada", "ultima_actualizacion"])
        return ReservaStock.objects.create(
            empresa=empresa,
            almacen=almacen,
            producto=producto,
            ubicacion=fila.ubicacion,
            lote_serie=fila.lote_serie,
            cantidad=cantidad,
            expira_en=data.get("expira_en"),
            referencia=data.get("referencia", ""),
            creado_por=usuario,
        )

    @classmethod
    @transaction.atomic
    def _cerrar(cls, reserva, estado) -> ReservaStock:
        reserva = ReservaStock.objects.select_for_update().get(pk=reserva.pk)
        if reserva.estado != ReservaStock.Estado.ACTIVA:
            return reserva
        fila = (
            StockSaldo.objects.select_for_update()
            .filter(
                almacen=reserva.almacen,
                producto=reserva.producto,
                ubicacion=reserva.ubicacion,
                lote_serie=reserva.lote_serie,
            )
            .first()
        )
        if fila:
            fila.cantidad_reservada = max(fila.cantidad_reservada - reserva.cantidad, 0)
            fila.save(update_fields=["cantidad_reservada", "ultima_actualizacion"])
        reserva.estado = estado
        reserva.save(update_fields=["estado", "actualizado_en"])
        return reserva

    @classmethod
    def liberar(cls, reserva, usuario=None) -> ReservaStock:
        return cls._cerrar(reserva, ReservaStock.Estado.LIBERADA)

    @classmethod
    def consumir(cls, reserva, usuario=None) -> ReservaStock:
        return cls._cerrar(reserva, ReservaStock.Estado.CONSUMIDA)

    @classmethod
    def liberar_vencidas(cls):
        from django.utils import timezone

        vencidas = ReservaStock.objects.filter(
            estado=ReservaStock.Estado.ACTIVA,
            expira_en__isnull=False,
            expira_en__lt=timezone.now(),
        )
        total = 0
        for reserva in vencidas:
            cls.liberar(reserva)
            total += 1
        return total
