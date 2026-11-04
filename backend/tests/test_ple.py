from datetime import date, timedelta
from decimal import Decimal

import pytest

from apps.movimientos.services import MovimientoService
from apps.sunat_ple.models import ExportacionPLE
from apps.sunat_ple.services import PleFilenameBuilder, PleService
from apps.sunat_ple.validator import PleValidator
from tests.conftest import crear_entrada, crear_salida


def _preparar_periodo(empresa, usuario, almacen, ubicacion, producto_pp):
    hoy = date.today()
    inicio = hoy.replace(day=1)
    anterior = inicio - timedelta(days=1)
    entrada = crear_entrada(
        empresa,
        usuario,
        almacen,
        producto_pp,
        10,
        10,
        ubicacion=ubicacion,
        fecha=anterior,
    )
    MovimientoService.confirmar(entrada, usuario)
    salida = crear_salida(
        empresa,
        usuario,
        almacen,
        producto_pp,
        2,
        ubicacion=ubicacion,
        fecha=hoy,
        operacion="01",
        comprobante="01",
        serie="F001",
        numero="00000001",
    )
    MovimientoService.confirmar(salida, usuario)
    return hoy


@pytest.mark.django_db
def test_nombre_archivo_ple_tiene_mascara_de_33_caracteres(empresa):
    nombre = PleFilenameBuilder.construir(empresa, "12.1", 2026, 11, True)
    assert nombre == "LE2012345678620261100120100001111.TXT"
    assert len(nombre) == 37  # 33 + .TXT
    sin_contenido = PleFilenameBuilder.construir(empresa, "13.1", 2026, 11, False)
    assert sin_contenido == "LE2012345678620261100130100001011.TXT"


@pytest.mark.django_db
def test_ple_12_1_genera_saldo_inicial_y_salida_negativa(
    empresa, usuario, almacen, ubicacion, producto_pp
):
    hoy = _preparar_periodo(empresa, usuario, almacen, ubicacion, producto_pp)
    resultado = PleService.generar(empresa, "12.1", hoy.year, hoy.month)

    assert resultado.errores == []
    assert len(resultado.lineas) == 2
    apertura = resultado.lineas[0].rstrip("|").split("|")
    salida = resultado.lineas[1].rstrip("|").split("|")
    assert len(apertura) == 19
    assert apertura[13] == "16"
    assert salida[13] == "01"
    assert Decimal(salida[16]) == Decimal("0.00")
    assert Decimal(salida[17]) == Decimal("-2.00")
    assert salida[18] == "1"
    assert resultado.nombre_archivo.endswith("00120100001111.TXT")


@pytest.mark.django_db
def test_ple_13_1_genera_costos_y_salida_negativa(
    empresa, usuario, almacen, ubicacion, producto_pp
):
    hoy = _preparar_periodo(empresa, usuario, almacen, ubicacion, producto_pp)
    resultado = PleService.generar(empresa, "13.1", hoy.year, hoy.month)

    assert resultado.errores == []
    assert len(resultado.lineas) == 2
    apertura = resultado.lineas[0].rstrip("|").split("|")
    salida = resultado.lineas[1].rstrip("|").split("|")
    assert len(apertura) == 27
    assert apertura[16] == "1"  # promedio ponderado
    assert Decimal(apertura[17]) == Decimal("10.00000000")
    assert Decimal(apertura[19]) == Decimal("100.00")
    assert Decimal(salida[20]) == Decimal("-2.00000000")
    assert Decimal(salida[22]) == Decimal("-20.00")
    assert Decimal(salida[23]) == Decimal("8.00000000")
    assert Decimal(salida[25]) == Decimal("80.00")
    assert resultado.nombre_archivo.endswith("00130100001111.TXT")


@pytest.mark.django_db
def test_validador_detecta_salida_positiva(empresa, usuario, almacen, ubicacion, producto_pp):
    hoy = _preparar_periodo(empresa, usuario, almacen, ubicacion, producto_pp)
    resultado = PleService.generar(empresa, "12.1", hoy.year, hoy.month)
    partes = resultado.lineas[1].rstrip("|").split("|")
    partes[17] = "2.00"  # salida positiva, inválida
    errores = PleValidator("12.1", hoy.year, hoy.month).validar(["|".join(partes) + "|"])
    assert errores
    assert any(e["campo"] == "18" for e in errores)


@pytest.mark.django_db
def test_validador_detecta_saldo_inconsistente(empresa, usuario, almacen, ubicacion, producto_pp):
    hoy = _preparar_periodo(empresa, usuario, almacen, ubicacion, producto_pp)
    resultado = PleService.generar(empresa, "13.1", hoy.year, hoy.month)
    partes = resultado.lineas[1].rstrip("|").split("|")
    partes[23] = "999.00000000"  # saldo de cantidad incorrecto
    errores = PleValidator("13.1", hoy.year, hoy.month).validar(
        [resultado.lineas[0], "|".join(partes) + "|"]
    )
    assert any(e["campo"] == "24" for e in errores)


@pytest.mark.django_db
def test_descarga_ple_registra_exportacion(
    api_client, empresa, usuario, almacen, ubicacion, producto_pp
):
    hoy = _preparar_periodo(empresa, usuario, almacen, ubicacion, producto_pp)
    response = api_client.get(f"/api/v1/ple/descargar/?libro=13.1&anio={hoy.year}&mes={hoy.month}")
    assert response.status_code == 200
    assert response["Content-Disposition"].endswith(
        f'filename="LE20123456786{hoy.year}{hoy.month:02d}00130100001111.TXT"'
    )
    assert len(response.content) > 0
    assert ExportacionPLE.objects.filter(empresa=empresa, libro="13.1").count() == 1


@pytest.mark.django_db
def test_preview_ple_expone_lineas_y_errores(
    api_client, empresa, usuario, almacen, ubicacion, producto_pp
):
    hoy = _preparar_periodo(empresa, usuario, almacen, ubicacion, producto_pp)
    response = api_client.get(f"/api/v1/ple/preview/?libro=12.1&anio={hoy.year}&mes={hoy.month}")
    assert response.status_code == 200
    assert response.data["cantidad_registros"] == 2
    assert response.data["errores"] == []
