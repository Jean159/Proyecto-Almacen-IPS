from datetime import date
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.core.models import Empresa
from apps.kardex.models import KardexValorizado
from apps.movimientos.models import MovimientoInventario


@pytest.mark.django_db
def test_login_y_me(usuario):
    client = APIClient()
    response = client.post(
        "/api/v1/auth/login/",
        {"email": "test@example.com", "password": "test12345"},
        format="json",
    )
    assert response.status_code == 200
    assert "access" in response.data
    assert response.data["usuario"]["email"] == "test@example.com"

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
    me = client.get("/api/v1/auth/me/")
    assert me.status_code == 200
    assert me.data["email"] == "test@example.com"


@pytest.mark.django_db
def test_health_es_publico():
    response = APIClient().get("/health/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.django_db
def test_api_lista_productos_y_stock(api_client, almacen, ubicacion, producto_pp, entrada_factory):
    entrada_factory(producto_pp, 5, 10, ubicacion=ubicacion)

    productos = api_client.get("/api/v1/productos/")
    assert productos.status_code == 200
    assert productos.data["count"] == 1

    stock = api_client.get("/api/v1/stock/")
    assert stock.status_code == 200
    assert stock.data["count"] == 1
    assert Decimal(stock.data["results"][0]["cantidad_fisica"]) == Decimal("5.0000")


@pytest.mark.django_db
def test_api_crea_y_confirma_movimiento(api_client, empresa, almacen, ubicacion, producto_pp):
    payload = {
        "tipo_movimiento": "ENTRADA",
        "tipo_operacion_sunat": "02",
        "tipo_comprobante_sunat": "01",
        "serie_comprobante": "F001",
        "numero_comprobante": "00000010",
        "fecha_operacion": date.today().isoformat(),
        "almacen": str(almacen.id),
        "glosa": "Compra vía API",
        "detalles": [
            {
                "producto": str(producto_pp.id),
                "ubicacion": str(ubicacion.id),
                "cantidad": "2.0000",
                "costo_unitario": "10.00000000",
            }
        ],
    }
    creado = api_client.post("/api/v1/movimientos/", payload, format="json")
    assert creado.status_code == 201
    assert creado.data["estado"] == "BORRADOR"

    confirmado = api_client.post(
        f"/api/v1/movimientos/{creado.data['id']}/confirmar/",
        {},
        format="json",
        HTTP_IDEMPOTENCY_KEY="api-test-1",
    )
    assert confirmado.status_code == 200
    assert confirmado.data["estado"] == "CONFIRMADO"

    repetido = api_client.post(
        f"/api/v1/movimientos/{creado.data['id']}/confirmar/",
        {},
        format="json",
        HTTP_IDEMPOTENCY_KEY="api-test-1",
    )
    assert repetido.status_code == 200
    assert KardexValorizado.objects.filter(producto=producto_pp).count() == 1


@pytest.mark.django_db
def test_api_patch_no_pierde_almacen_destino(
    api_client, almacen, almacen_destino, ubicacion, producto_fifo
):
    payload = {
        "tipo_movimiento": "TRANSFERENCIA",
        "tipo_operacion_sunat": "11",
        "tipo_comprobante_sunat": "00",
        "fecha_operacion": date.today().isoformat(),
        "almacen": str(almacen.id),
        "almacen_destino": str(almacen_destino.id),
        "detalles": [
            {
                "producto": str(producto_fifo.id),
                "ubicacion": str(ubicacion.id),
                "cantidad": "1.0000",
            }
        ],
    }
    creado = api_client.post("/api/v1/movimientos/", payload, format="json")
    assert creado.status_code == 201
    actualizado = api_client.patch(
        f"/api/v1/movimientos/{creado.data['id']}/",
        {"glosa": "Cambio de glosa"},
        format="json",
    )
    assert actualizado.status_code == 200
    assert str(actualizado.data["almacen_destino"]) == str(almacen_destino.id)


@pytest.mark.django_db
def test_api_usa_operacion_por_defecto(api_client, almacen, ubicacion, producto_pp):
    payload = {
        "tipo_movimiento": "ENTRADA",
        "tipo_comprobante_sunat": "01",
        "serie_comprobante": "F001",
        "numero_comprobante": "00000011",
        "fecha_operacion": date.today().isoformat(),
        "almacen": str(almacen.id),
        "detalles": [
            {
                "producto": str(producto_pp.id),
                "ubicacion": str(ubicacion.id),
                "cantidad": "1.0000",
                "costo_unitario": "10.00000000",
            }
        ],
    }
    creado = api_client.post("/api/v1/movimientos/", payload, format="json")
    assert creado.status_code == 201
    assert creado.data["tipo_operacion_sunat"] == "02"


@pytest.mark.django_db
def test_dashboard_kpis(api_client, almacen, ubicacion, producto_pp, entrada_factory):
    entrada_factory(producto_pp, 10, 10, ubicacion=ubicacion)
    response = api_client.get("/api/v1/dashboard/kpis/")
    assert response.status_code == 200
    assert Decimal(response.data["valor_inventario"]) == Decimal("100.00")
    assert Decimal(response.data["unidades_stock"]) == Decimal("10.0000")
    assert response.data["stock_por_almacen"][0]["almacen__codigo"] == "ALM-001"


@pytest.mark.django_db
def test_api_reserva_y_liberacion(api_client, almacen, ubicacion, producto_pp, entrada_factory):
    entrada_factory(producto_pp, 5, 10, ubicacion=ubicacion)
    creada = api_client.post(
        "/api/v1/reservas/",
        {
            "almacen": str(almacen.id),
            "producto": str(producto_pp.id),
            "ubicacion": str(ubicacion.id),
            "cantidad": "2.0000",
            "referencia": "PEDIDO-API",
        },
        format="json",
    )
    assert creada.status_code == 201
    stock = api_client.get("/api/v1/stock/")
    assert Decimal(stock.data["results"][0]["cantidad_reservada"]) == Decimal("2.0000")

    liberada = api_client.post(f"/api/v1/reservas/{creada.data['id']}/liberar/", {}, format="json")
    assert liberada.status_code == 200
    assert liberada.data["estado"] == "LIBERADA"
    stock = api_client.get("/api/v1/stock/")
    assert Decimal(stock.data["results"][0]["cantidad_reservada"]) == Decimal("0.0000")


@pytest.mark.django_db
def test_api_cierre_periodo_acciones(api_client):
    hoy = date.today()
    creado = api_client.post(
        "/api/v1/cierres-periodo/",
        {"anio": hoy.year, "mes": hoy.month, "estado": "ABIERTO"},
        format="json",
    )
    assert creado.status_code == 201
    cerrado = api_client.post(
        f"/api/v1/cierres-periodo/{creado.data['id']}/cerrar/", {}, format="json"
    )
    assert cerrado.status_code == 200
    assert cerrado.data["estado"] == "CERRADO"
    abierto = api_client.post(
        f"/api/v1/cierres-periodo/{creado.data['id']}/abrir/", {}, format="json"
    )
    assert abierto.status_code == 200
    assert abierto.data["estado"] == "ABIERTO"


@pytest.mark.django_db
def test_api_exporta_kardex_excel(api_client, almacen, ubicacion, producto_pp, entrada_factory):
    entrada_factory(producto_pp, 2, 10, ubicacion=ubicacion)
    response = api_client.get("/api/v1/kardex/export/?modo=valorizado")
    assert response.status_code == 200
    assert response["Content-Type"].startswith("application/vnd.openxmlformats-officedocument")
    assert len(response.content) > 0


@pytest.mark.django_db
def test_api_rechaza_empresa_ajena(api_client, usuario):
    otra = Empresa.objects.create(ruc="20999999999", razon_social="Otra Empresa S.A.C.")
    api_client.credentials(HTTP_X_EMPRESA_ID=str(otra.id))
    response = api_client.get("/api/v1/productos/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_api_anula_movimiento(
    api_client, empresa, usuario, almacen, ubicacion, producto_pp, entrada_factory
):
    entrada_factory(producto_pp, 5, 10, ubicacion=ubicacion)
    payload = {
        "tipo_movimiento": "SALIDA",
        "tipo_operacion_sunat": "28",
        "tipo_comprobante_sunat": "00",
        "fecha_operacion": date.today().isoformat(),
        "almacen": str(almacen.id),
        "detalles": [
            {
                "producto": str(producto_pp.id),
                "ubicacion": str(ubicacion.id),
                "cantidad": "2.0000",
            }
        ],
    }
    creado = api_client.post("/api/v1/movimientos/", payload, format="json")
    api_client.post(f"/api/v1/movimientos/{creado.data['id']}/confirmar/", {}, format="json")
    anulado = api_client.post(f"/api/v1/movimientos/{creado.data['id']}/anular/", {}, format="json")
    assert anulado.status_code == 200
    assert anulado.data["estado"] == "CONFIRMADO"
    original = MovimientoInventario.objects.get(pk=creado.data["id"])
    assert original.estado == MovimientoInventario.Estado.ANULADO
