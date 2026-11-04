from datetime import date, timedelta
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.almacenes.models import Almacen, Ubicacion
from apps.catalogo.models import CategoriaProducto, LoteSerie, Producto
from apps.core.models import Empresa, Usuario, UsuarioEmpresa
from apps.movimientos.services import MovimientoService


@pytest.fixture
def empresa(db):
    return Empresa.objects.create(
        ruc="20123456786",
        razon_social="Empresa de Prueba S.A.C.",
        moneda_principal="PEN",
    )


@pytest.fixture
def usuario(db):
    user = Usuario.objects.create_user(
        email="test@example.com",
        password="test12345",
        first_name="Test",
        last_name="User",
    )
    return user


@pytest.fixture
def membresia(empresa, usuario):
    return UsuarioEmpresa.objects.create(
        usuario=usuario,
        empresa=empresa,
        rol=UsuarioEmpresa.Rol.ADMIN,
    )


@pytest.fixture
def almacen(empresa):
    return Almacen.objects.create(
        empresa=empresa,
        codigo="ALM-001",
        codigo_establecimiento="0001",
        nombre="Almacén Central",
        direccion="Av. Prueba 123",
        ubigeo="150101",
    )


@pytest.fixture
def almacen_destino(empresa):
    return Almacen.objects.create(
        empresa=empresa,
        codigo="ALM-002",
        codigo_establecimiento="0002",
        nombre="Almacén Destino",
        direccion="Av. Prueba 456",
        ubigeo="150101",
    )


@pytest.fixture
def ubicacion(almacen):
    return Ubicacion.objects.create(
        almacen=almacen,
        codigo="PAS-01-RACK-01",
        descripcion="Pasillo 1",
    )


@pytest.fixture
def categoria(empresa):
    return CategoriaProducto.objects.create(empresa=empresa, nombre="General")


@pytest.fixture
def producto_pp(empresa, categoria):
    return Producto.objects.create(
        empresa=empresa,
        categoria=categoria,
        sku="SKU-PP",
        descripcion="Producto promedio ponderado",
        codigo_propio_sunat="COD-PP",
        metodo_valuacion="1",
        stock_minimo=Decimal("2"),
    )


@pytest.fixture
def producto_fifo(empresa, categoria):
    return Producto.objects.create(
        empresa=empresa,
        categoria=categoria,
        sku="SKU-FIFO",
        descripcion="Producto FIFO",
        codigo_propio_sunat="COD-FIFO",
        metodo_valuacion="2",
    )


@pytest.fixture
def producto_lote(empresa, categoria):
    return Producto.objects.create(
        empresa=empresa,
        categoria=categoria,
        sku="SKU-LOTE",
        descripcion="Producto con lote",
        codigo_propio_sunat="COD-LOTE",
        metodo_valuacion="2",
        control_lotes=True,
    )


@pytest.fixture
def lote(producto_lote):
    return LoteSerie.objects.create(
        producto=producto_lote,
        numero_lote_serie="LOTE-001",
        fecha_vencimiento=date.today() + timedelta(days=365),
    )


@pytest.fixture
def api_client(usuario, empresa, membresia):
    client = APIClient()
    client.force_authenticate(user=usuario)
    client.credentials(HTTP_X_EMPRESA_ID=str(empresa.id))
    return client


def crear_entrada(
    empresa,
    usuario,
    almacen,
    producto,
    cantidad,
    costo,
    *,
    ubicacion=None,
    lote=None,
    fecha=None,
    operacion="16",
    comprobante="00",
    serie="0",
    numero="0",
):
    return MovimientoService.crear_borrador(
        empresa,
        usuario,
        {
            "tipo_movimiento": "ENTRADA",
            "tipo_operacion_sunat": operacion,
            "tipo_comprobante_sunat": comprobante,
            "serie_comprobante": serie,
            "numero_comprobante": numero,
            "fecha_operacion": fecha or date.today(),
            "almacen": almacen,
            "glosa": "Entrada de prueba",
            "detalles": [
                {
                    "producto": producto,
                    "ubicacion": ubicacion,
                    "lote_serie": lote,
                    "cantidad": Decimal(str(cantidad)),
                    "costo_unitario": Decimal(str(costo)),
                }
            ],
        },
    )


def crear_salida(
    empresa,
    usuario,
    almacen,
    producto,
    cantidad,
    *,
    ubicacion=None,
    lote=None,
    fecha=None,
    operacion="28",
    comprobante="00",
    serie="0",
    numero="0",
):
    return MovimientoService.crear_borrador(
        empresa,
        usuario,
        {
            "tipo_movimiento": "SALIDA",
            "tipo_operacion_sunat": operacion,
            "tipo_comprobante_sunat": comprobante,
            "serie_comprobante": serie,
            "numero_comprobante": numero,
            "fecha_operacion": fecha or date.today(),
            "almacen": almacen,
            "glosa": "Salida de prueba",
            "detalles": [
                {
                    "producto": producto,
                    "ubicacion": ubicacion,
                    "lote_serie": lote,
                    "cantidad": Decimal(str(cantidad)),
                }
            ],
        },
    )


@pytest.fixture
def entrada_factory(empresa, usuario, almacen):
    def _crear(producto, cantidad, costo, **kwargs):
        mov = crear_entrada(empresa, usuario, almacen, producto, cantidad, costo, **kwargs)
        return MovimientoService.confirmar(mov, usuario)

    return _crear


@pytest.fixture
def salida_factory(empresa, usuario, almacen):
    def _crear(producto, cantidad, **kwargs):
        mov = crear_salida(empresa, usuario, almacen, producto, cantidad, **kwargs)
        return MovimientoService.confirmar(mov, usuario)

    return _crear
