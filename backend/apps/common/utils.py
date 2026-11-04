import hashlib
import re
from datetime import date
from decimal import ROUND_HALF_UP, Decimal


def sanitizar_texto_ple(valor: str | None, max_length: int | None = None) -> str:
    """SUNAT no permite |, / ni \\ dentro de campos de texto."""
    texto = str(valor or "")
    texto = re.sub(r"[|/\\]", " ", texto)
    texto = re.sub(r"[\r\n\t]+", " ", texto)
    texto = re.sub(r"\s+", " ", texto).strip()
    if max_length:
        texto = texto[:max_length]
    return texto


def formatear_decimal(valor, decimales: int) -> str:
    if valor is None:
        valor = Decimal("0")
    cuantizador = Decimal("1").scaleb(-decimales)
    numero = Decimal(valor).quantize(cuantizador, rounding=ROUND_HALF_UP)
    if numero == 0:
        numero = abs(numero)
    return f"{numero:.{decimales}f}"


def redondear(valor, decimales: int) -> Decimal:
    cuantizador = Decimal("1").scaleb(-decimales)
    return Decimal(valor or 0).quantize(cuantizador, rounding=ROUND_HALF_UP)


def periodo_de_fecha(fecha: date) -> str:
    return fecha.strftime("%Y%m")


def primer_dia_periodo(anio: int, mes: int) -> date:
    return date(anio, mes, 1)


def ultimo_dia_periodo(anio: int, mes: int) -> date:
    if mes == 12:
        return date(anio, 12, 31)
    return date(anio, mes + 1, 1) - __import__("datetime").timedelta(days=1)


def hash_sha256(texto: str) -> str:
    return hashlib.sha256(texto.encode("utf-8")).hexdigest()
