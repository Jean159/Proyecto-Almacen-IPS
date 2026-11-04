import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from decimal import Decimal

import pytest
from django.db import close_old_connections, connections

from apps.common.exceptions import StockInsuficiente
from apps.core.models import Usuario
from apps.inventario.models import StockSaldo
from apps.kardex.models import KardexValorizado
from apps.movimientos.models import MovimientoInventario
from apps.movimientos.services import MovimientoService
from tests.conftest import crear_salida


@pytest.mark.django_db(transaction=True)
def test_dos_ventas_simultaneas_no_dejan_stock_negativo(
    empresa, usuario, almacen, ubicacion, producto_pp, entrada_factory
):
    entrada_factory(producto_pp, 1, 10, ubicacion=ubicacion)

    ventas = [
        crear_salida(
            empresa,
            usuario,
            almacen,
            producto_pp,
            1,
            ubicacion=ubicacion,
            fecha=date.today(),
        )
        for _ in range(2)
    ]

    barrera = threading.Barrier(2)
    resultados = []

    def confirmar(movimiento_id, usuario_id):
        close_old_connections()
        try:
            barrera.wait(timeout=10)
            movimiento = MovimientoInventario.objects.get(pk=movimiento_id)
            user = Usuario.objects.get(pk=usuario_id)
            MovimientoService.confirmar(movimiento, user)
            resultados.append(("ok", movimiento_id))
        except Exception as exc:  # noqa: BLE001 - se inspecciona en la aserción
            resultados.append(("error", type(exc).__name__, str(exc)))
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=2) as pool:
        list(
            pool.map(
                lambda venta: confirmar(venta.id, usuario.id),
                ventas,
            )
        )

    exitos = [r for r in resultados if r[0] == "ok"]
    errores = [r for r in resultados if r[0] == "error"]
    assert len(exitos) == 1, resultados
    assert len(errores) == 1, resultados
    assert errores[0][1] == StockInsuficiente.__name__

    stock = StockSaldo.objects.get(almacen=almacen, producto=producto_pp, ubicacion=ubicacion)
    assert stock.cantidad_fisica == Decimal("0.0000")
    assert (
        KardexValorizado.objects.filter(producto=producto_pp).count() == 2
    )  # entrada + una sola salida
    assert (
        MovimientoInventario.objects.filter(
            tipo_movimiento="SALIDA", estado=MovimientoInventario.Estado.CONFIRMADO
        ).count()
        == 1
    )
