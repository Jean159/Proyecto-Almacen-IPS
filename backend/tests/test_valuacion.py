from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.db.utils import DatabaseError

from apps.common.exceptions import (
    PeriodoCerrado,
    RetroactividadNoPermitida,
    StockInsuficiente,
)
from apps.core.models import CierrePeriodo
from apps.inventario.models import ReservaStock, StockSaldo
from apps.inventario.services import ReservaService
from apps.kardex.models import CapaCosto, KardexValorizado, SaldoKardex
from apps.movimientos.models import MovimientoInventario
from apps.movimientos.services import MovimientoService
from tests.conftest import crear_entrada, crear_salida


@pytest.mark.django_db
def test_promedio_ponderado_entradas_y_salida(
    empresa, usuario, almacen, ubicacion, producto_pp, entrada_factory, salida_factory
):
    entrada_factory(producto_pp, 10, 10, ubicacion=ubicacion)
    entrada_factory(producto_pp, 10, 20, ubicacion=ubicacion)

    saldo = SaldoKardex.objects.get(empresa=empresa, almacen=almacen, producto=producto_pp)
    assert saldo.cantidad == Decimal("20.0000")
    assert saldo.costo_total == Decimal("300.00")
    assert saldo.costo_unitario == Decimal("15.00000000")

    salida_factory(producto_pp, 5, ubicacion=ubicacion)

    saldo.refresh_from_db()
    assert saldo.cantidad == Decimal("15.0000")
    assert saldo.costo_total == Decimal("225.00")
    assert saldo.costo_unitario == Decimal("15.00000000")

    kardex_salida = KardexValorizado.objects.filter(
        producto=producto_pp, lado=KardexValorizado.Lado.SALIDA
    ).get()
    assert kardex_salida.cantidad_salida == Decimal("5.0000")
    assert kardex_salida.costo_unitario_salida == Decimal("15.00000000")
    assert kardex_salida.costo_total_salida == Decimal("75.00")
    assert kardex_salida.cantidad_saldo == Decimal("15.0000")

    stock = StockSaldo.objects.get(almacen=almacen, producto=producto_pp, ubicacion=ubicacion)
    assert stock.cantidad_fisica == Decimal("15.0000")


@pytest.mark.django_db
def test_fifo_consume_capas_mas_antiguas(
    empresa, usuario, almacen, ubicacion, producto_fifo, entrada_factory, salida_factory
):
    entrada_factory(producto_fifo, 5, 10, ubicacion=ubicacion)
    entrada_factory(producto_fifo, 5, 12, ubicacion=ubicacion)

    salida_factory(producto_fifo, 7, ubicacion=ubicacion)

    saldo = SaldoKardex.objects.get(empresa=empresa, almacen=almacen, producto=producto_fifo)
    assert saldo.cantidad == Decimal("3.0000")
    assert saldo.costo_total == Decimal("36.00")
    assert saldo.costo_unitario == Decimal("12.00000000")

    capas = list(
        CapaCosto.objects.filter(empresa=empresa, almacen=almacen, producto=producto_fifo).order_by(
            "fecha_operacion", "secuencia"
        )
    )
    assert capas[0].cantidad_disponible == Decimal("0.0000")
    assert capas[1].cantidad_disponible == Decimal("3.0000")

    kardex_salida = KardexValorizado.objects.filter(
        producto=producto_fifo, lado=KardexValorizado.Lado.SALIDA
    ).get()
    assert kardex_salida.costo_total_salida == Decimal("74.00")
    assert kardex_salida.costo_unitario_salida == Decimal("10.57142857")


@pytest.mark.django_db
def test_fifo_respeta_lote_indicado(
    empresa,
    usuario,
    almacen,
    ubicacion,
    producto_lote,
    lote,
    entrada_factory,
    salida_factory,
):
    from apps.catalogo.models import LoteSerie

    lote2 = LoteSerie.objects.create(producto=producto_lote, numero_lote_serie="LOTE-002")
    entrada_factory(producto_lote, 5, 10, ubicacion=ubicacion, lote=lote)
    entrada_factory(producto_lote, 5, 20, ubicacion=ubicacion, lote=lote2)

    salida_factory(producto_lote, 2, ubicacion=ubicacion, lote=lote2)

    capas = {
        c.lote_serie.numero_lote_serie: c.cantidad_disponible
        for c in CapaCosto.objects.filter(almacen=almacen, producto=producto_lote).select_related(
            "lote_serie"
        )
    }
    assert capas["LOTE-001"] == Decimal("5.0000")
    assert capas["LOTE-002"] == Decimal("3.0000")
    kardex = KardexValorizado.objects.get(producto=producto_lote, lado=KardexValorizado.Lado.SALIDA)
    assert kardex.costo_total_salida == Decimal("40.00")


@pytest.mark.django_db
def test_rechaza_stock_negativo(
    empresa, usuario, almacen, ubicacion, producto_pp, entrada_factory, salida_factory
):
    entrada_factory(producto_pp, 1, 10, ubicacion=ubicacion)

    with pytest.raises(StockInsuficiente):
        salida_factory(producto_pp, 2, ubicacion=ubicacion)

    stock = StockSaldo.objects.get(almacen=almacen, producto=producto_pp, ubicacion=ubicacion)
    assert stock.cantidad_fisica == Decimal("1.0000")
    assert KardexValorizado.objects.filter(producto=producto_pp).count() == 1


@pytest.mark.django_db
def test_transferencia_conserva_costo_y_lotes(
    empresa,
    usuario,
    almacen,
    almacen_destino,
    ubicacion,
    producto_lote,
    lote,
    entrada_factory,
):
    entrada_factory(producto_lote, 10, 5, ubicacion=ubicacion, lote=lote)

    movimiento = MovimientoService.crear_borrador(
        empresa,
        usuario,
        {
            "tipo_movimiento": "TRANSFERENCIA",
            "tipo_operacion_sunat": "11",
            "tipo_comprobante_sunat": "00",
            "fecha_operacion": date.today(),
            "almacen": almacen,
            "almacen_destino": almacen_destino,
            "glosa": "Transferencia de prueba",
            "detalles": [
                {
                    "producto": producto_lote,
                    "ubicacion": ubicacion,
                    "lote_serie": lote,
                    "cantidad": Decimal("3"),
                }
            ],
        },
    )
    MovimientoService.confirmar(movimiento, usuario)

    stock_origen = StockSaldo.objects.get(almacen=almacen, producto=producto_lote, lote_serie=lote)
    stock_destino = StockSaldo.objects.get(
        almacen=almacen_destino, producto=producto_lote, lote_serie=lote
    )
    assert stock_origen.cantidad_fisica == Decimal("7.0000")
    assert stock_destino.cantidad_fisica == Decimal("3.0000")

    saldo_destino = SaldoKardex.objects.get(
        empresa=empresa, almacen=almacen_destino, producto=producto_lote
    )
    assert saldo_destino.cantidad == Decimal("3.0000")
    assert saldo_destino.costo_total == Decimal("15.00")
    assert saldo_destino.costo_unitario == Decimal("5.00000000")

    lados = set(
        KardexValorizado.objects.filter(producto=producto_lote).values_list(
            "lado", "almacen__codigo", "tipo_operacion"
        )
    )
    assert lados == {
        ("ENTRADA", "ALM-001", "16"),
        ("SALIDA", "ALM-001", "11"),
        ("ENTRADA", "ALM-002", "21"),
    }


@pytest.mark.django_db
def test_anulacion_genera_reverso_y_restituye_stock(
    empresa, usuario, almacen, ubicacion, producto_pp, entrada_factory
):
    entrada_factory(producto_pp, 10, 10, ubicacion=ubicacion)
    salida = crear_salida(empresa, usuario, almacen, producto_pp, 2, ubicacion=ubicacion)
    MovimientoService.confirmar(salida, usuario)
    assert StockSaldo.objects.get(
        almacen=almacen, producto=producto_pp, ubicacion=ubicacion
    ).cantidad_fisica == Decimal("8.0000")

    reverso = MovimientoService.anular(salida, usuario)
    salida.refresh_from_db()

    assert salida.estado == MovimientoInventario.Estado.ANULADO
    assert reverso.estado == MovimientoInventario.Estado.CONFIRMADO
    assert reverso.movimiento_reverso_de_id == salida.id
    assert StockSaldo.objects.get(
        almacen=almacen, producto=producto_pp, ubicacion=ubicacion
    ).cantidad_fisica == Decimal("10.0000")
    assert SaldoKardex.objects.get(
        empresa=empresa, almacen=almacen, producto=producto_pp
    ).cantidad == Decimal("10.0000")


@pytest.mark.django_db
def test_reserva_afecta_disponibilidad_y_se_libera(
    empresa, usuario, almacen, ubicacion, producto_pp, entrada_factory, salida_factory
):
    entrada_factory(producto_pp, 5, 10, ubicacion=ubicacion)
    reserva = ReservaService.crear(
        empresa,
        usuario,
        {
            "almacen": almacen,
            "producto": producto_pp,
            "ubicacion": ubicacion,
            "cantidad": Decimal("2"),
            "referencia": "PEDIDO-1",
        },
    )
    stock = StockSaldo.objects.get(almacen=almacen, producto=producto_pp, ubicacion=ubicacion)
    assert stock.cantidad_reservada == Decimal("2.0000")

    with pytest.raises(StockInsuficiente):
        salida_factory(producto_pp, 4, ubicacion=ubicacion)

    ReservaService.liberar(reserva, usuario)
    stock.refresh_from_db()
    assert stock.cantidad_reservada == Decimal("0.0000")
    assert ReservaStock.objects.get(pk=reserva.pk).estado == ReservaStock.Estado.LIBERADA

    salida_factory(producto_pp, 4, ubicacion=ubicacion)
    stock.refresh_from_db()
    assert stock.cantidad_fisica == Decimal("1.0000")


@pytest.mark.django_db
def test_bloquea_retroactividad(empresa, usuario, almacen, ubicacion, producto_pp, entrada_factory):
    hoy = date.today()
    entrada_factory(producto_pp, 10, 10, ubicacion=ubicacion, fecha=hoy)

    retroactiva = crear_entrada(
        empresa,
        usuario,
        almacen,
        producto_pp,
        1,
        10,
        ubicacion=ubicacion,
        fecha=hoy - timedelta(days=1),
    )
    with pytest.raises(RetroactividadNoPermitida):
        MovimientoService.confirmar(retroactiva, usuario)


@pytest.mark.django_db
def test_bloquea_periodo_cerrado(empresa, usuario, almacen, ubicacion, producto_pp):
    hoy = date.today()
    CierrePeriodo.objects.create(
        empresa=empresa,
        anio=hoy.year,
        mes=hoy.month,
        estado=CierrePeriodo.Estado.CERRADO,
        cerrado_por=usuario,
    )
    movimiento = crear_entrada(
        empresa,
        usuario,
        almacen,
        producto_pp,
        1,
        10,
        ubicacion=ubicacion,
        fecha=hoy,
    )
    with pytest.raises(PeriodoCerrado):
        MovimientoService.confirmar(movimiento, usuario)


@pytest.mark.django_db
def test_kardex_es_inmutable(empresa, usuario, almacen, ubicacion, producto_pp, entrada_factory):
    entrada_factory(producto_pp, 1, 10, ubicacion=ubicacion)
    fila = KardexValorizado.objects.get(producto=producto_pp)
    fila.glosa = "intento de cambio"
    with pytest.raises(ValidationError):
        fila.save()
    with pytest.raises(ValidationError):
        fila.delete()

    from django.db import connection, transaction

    with pytest.raises(DatabaseError):
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE kardex_valorizado SET glosa = %s WHERE id = %s",
                    ["cambio directo", str(fila.id)],
                )
