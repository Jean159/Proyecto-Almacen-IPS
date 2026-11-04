"""Validador de estructura y reglas del PLE 12.1 y 13.1."""

import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from apps.common.utils import ultimo_dia_periodo
from apps.core.sunat import (
    CATALOGOS_EXISTENCIA,
    METODOS_VALUACION,
    OPERACIONES_CON_COMPROBANTE,
    TIPOS_COMPROBANTE,
    TIPOS_EXISTENCIA,
    TIPOS_OPERACION,
    UNIDADES_MEDIDA,
)

CAMPOS_REQUERIDOS = {"12.1": 19, "13.1": 27}
CAMPOS_MAXIMOS = {"12.1": 40, "13.1": 56}

CODIGOS_TABLA = {
    5: {c for c, _ in TIPOS_EXISTENCIA},
    6: {c for c, _ in UNIDADES_MEDIDA},
    10: {c for c, _ in TIPOS_COMPROBANTE},
    12: {c for c, _ in TIPOS_OPERACION},
    13: {c for c, _ in CATALOGOS_EXISTENCIA},
    14: {c for c, _ in METODOS_VALUACION},
}


class PleValidator:
    def __init__(self, libro: str, anio: int, mes: int):
        if libro not in CAMPOS_REQUERIDOS:
            raise ValueError("Libro PLE inválido.")
        self.libro = libro
        self.anio = anio
        self.mes = mes
        self.periodo = f"{anio}{mes:02d}"
        self.fin_periodo = ultimo_dia_periodo(anio, mes)
        self.errores: list[dict] = []
        self._saldos: dict[tuple, tuple[Decimal, Decimal]] = {}

    def validar(self, lineas: list[str]) -> list[dict]:
        self.errores = []
        self._saldos = {}
        for numero, linea in enumerate(lineas, start=1):
            self._validar_linea(numero, linea)
        return self.errores

    def _error(self, linea, campo, mensaje):
        self.errores.append({"linea": linea, "campo": str(campo), "mensaje": mensaje})

    def _validar_linea(self, numero, linea):
        partes = linea.rstrip("\r\n").split("|")
        if partes and partes[-1] == "":
            partes.pop()
        requeridos = CAMPOS_REQUERIDOS[self.libro]
        maximo = CAMPOS_MAXIMOS[self.libro]
        if len(partes) < requeridos:
            self._error(
                numero, "estructura", f"Se esperaban {requeridos} campos y llegaron {len(partes)}."
            )
            return
        if len(partes) > maximo:
            self._error(numero, "estructura", f"Se esperaban como máximo {maximo} campos.")
            return

        def campo(n):
            return partes[n - 1].strip() if n - 1 < len(partes) else ""

        # Campos comunes 1-16
        if not re.fullmatch(r"\d{8}", campo(1)):
            self._error(numero, 1, "Periodo debe tener formato AAAAMM00.")
        else:
            periodo = campo(1)
            anio, mes = int(periodo[:4]), int(periodo[4:6])
            if periodo[6:] != "00" or not 1 <= mes <= 12:
                self._error(numero, 1, "Periodo inválido.")
            elif date(anio, mes, 1) > date(self.anio, self.mes, 1):
                self._error(numero, 1, "El periodo no puede ser mayor al informado.")

        if not campo(2) or len(campo(2)) > 40:
            self._error(numero, 2, "CUO obligatorio de hasta 40 caracteres.")
        if not re.fullmatch(r"[AMC][A-Za-z0-9]{1,9}", campo(3)):
            self._error(numero, 3, "Correlativo de asiento inválido; debe iniciar con A, M o C.")
        if not re.fullmatch(r"\d{4,7}", campo(4)) or int(campo(4)) <= 0:
            self._error(numero, 4, "Establecimiento anexo inválido (4 a 7 dígitos).")
        if campo(5) not in CODIGOS_TABLA[13]:
            self._error(numero, 5, "Catálogo de existencia inválido (Tabla 13).")
        if campo(6) not in CODIGOS_TABLA[5]:
            self._error(numero, 6, "Tipo de existencia inválido (Tabla 5).")
        if not campo(7) or len(campo(7)) > 24:
            self._error(numero, 7, "Código propio obligatorio de hasta 24 caracteres.")

        catalogo_int = campo(8)
        codigo_int = campo(9)
        if catalogo_int:
            if catalogo_int == "9" or catalogo_int not in {"1", "3"}:
                self._error(numero, 8, "Catálogo internacional inválido; no admite 9.")
            if not codigo_int or len(codigo_int) > 128:
                self._error(numero, 9, "Código internacional obligatorio si se informa catálogo.")
        elif codigo_int:
            self._error(numero, 8, "Debe informar el catálogo internacional junto al código.")

        fecha_doc = self._parse_fecha(campo(10))
        if not fecha_doc:
            self._error(numero, 10, "Fecha de emisión inválida (DD/MM/AAAA).")
        elif fecha_doc > self.fin_periodo:
            self._error(numero, 10, "La fecha no puede ser mayor al periodo informado.")

        if campo(11) not in CODIGOS_TABLA[10]:
            self._error(numero, 11, "Tipo de comprobante inválido (Tabla 10).")
        if not campo(12) or len(campo(12)) > 20:
            self._error(numero, 12, "Serie obligatoria de hasta 20 caracteres.")
        if not campo(13) or len(campo(13)) > 20:
            self._error(numero, 13, "Número obligatorio de hasta 20 caracteres.")
        if campo(14) not in CODIGOS_TABLA[12]:
            self._error(numero, 14, "Tipo de operación inválido (Tabla 12).")
        elif campo(14) in OPERACIONES_CON_COMPROBANTE:
            if campo(11) == "00":
                self._error(numero, 11, "La operación exige un comprobante distinto de 00.")
            if campo(12) in ("", "0") or campo(13) in ("", "0"):
                self._error(numero, 12, "La operación exige serie y número.")
        if not campo(15) or len(campo(15)) > 80:
            self._error(numero, 15, "Descripción obligatoria de hasta 80 caracteres.")
        if re.search(r"[|/\\]", campo(15)):
            self._error(numero, 15, "La descripción contiene caracteres no permitidos.")
        if campo(16) not in CODIGOS_TABLA[6]:
            self._error(numero, 16, "Unidad de medida inválida (Tabla 6).")

        if self.libro == "12.1":
            self._validar_12_1(numero, partes, campo)
        else:
            self._validar_13_1(numero, partes, campo)

    def _validar_12_1(self, numero, partes, campo):
        entrada = self._decimal(campo(17))
        salida = self._decimal(campo(18))
        if not self._formato_decimal(campo(17), 12, 2):
            self._error(numero, 17, "La entrada debe tener hasta 12 enteros y 2 decimales.")
        if not self._formato_decimal(campo(18), 12, 2):
            self._error(numero, 18, "La salida debe tener hasta 12 enteros y 2 decimales.")
        if entrada is None or entrada < 0:
            self._error(numero, 17, "Entrada inválida; debe ser positiva o 0.00.")
        if salida is None or salida > 0:
            self._error(numero, 18, "Salida inválida; debe ser negativa o 0.00.")
        if entrada and salida and entrada != 0 and salida != 0:
            self._error(numero, 18, "Entrada y salida son excluyentes en una misma fila.")
        if campo(19) not in {"1", "8", "9"}:
            self._error(numero, 19, "Estado de operación inválido.")

    def _validar_13_1(self, numero, partes, campo):
        if campo(17) not in CODIGOS_TABLA[14]:
            self._error(numero, 17, "Método de valuación inválido (Tabla 14).")

        entrada = self._decimal(campo(18))
        costo_u_entrada = self._decimal(campo(19))
        costo_t_entrada = self._decimal(campo(20))
        salida = self._decimal(campo(21))
        costo_u_salida = self._decimal(campo(22))
        costo_t_salida = self._decimal(campo(23))
        saldo = self._decimal(campo(24))
        costo_u_saldo = self._decimal(campo(25))
        costo_t_saldo = self._decimal(campo(26))

        formatos = {
            18: (12, 8),
            19: (12, 8),
            20: (20, 2),
            21: (12, 8),
            22: (12, 8),
            23: (20, 2),
            24: (12, 8),
            25: (12, 8),
            26: (12, 2),
        }
        for n, (enteros, decimales) in formatos.items():
            if not self._formato_decimal(campo(n), enteros, decimales):
                self._error(
                    numero,
                    n,
                    f"Formato numérico inválido: hasta {enteros} enteros y {decimales} decimales.",
                )

        for valor, n in (
            (entrada, 18),
            (costo_u_entrada, 19),
            (costo_t_entrada, 20),
            (salida, 21),
            (costo_u_salida, 22),
            (costo_t_salida, 23),
            (saldo, 24),
            (costo_u_saldo, 25),
            (costo_t_saldo, 26),
        ):
            if valor is None:
                self._error(numero, n, "Valor numérico inválido.")
        if any(
            v is None
            for v in (
                entrada,
                costo_u_entrada,
                costo_t_entrada,
                salida,
                costo_u_salida,
                costo_t_salida,
                saldo,
                costo_u_saldo,
                costo_t_saldo,
            )
        ):
            return

        if entrada < 0:
            self._error(numero, 18, "Cantidad de entrada no puede ser negativa.")
        if costo_t_entrada < 0:
            self._error(numero, 20, "Costo total de entrada no puede ser negativo.")
        if salida > 0:
            self._error(numero, 21, "Cantidad de salida debe ser negativa o 0.00.")
        if costo_u_entrada < 0:
            self._error(numero, 19, "Costo unitario de entrada no puede ser negativo.")
        if costo_u_salida < 0:
            self._error(numero, 22, "Costo unitario de salida no puede ser negativo.")
        if costo_u_saldo < 0:
            self._error(numero, 25, "Costo unitario de saldo no puede ser negativo.")
        if costo_t_salida > 0:
            self._error(numero, 23, "Costo total de salida debe ser negativo o 0.00.")
        if saldo < 0:
            self._error(numero, 24, "Saldo final no puede ser negativo.")
        if campo(27) not in {"1", "8", "9"}:
            self._error(numero, 27, "Estado de operación inválido.")

        # Coherencia aritmética de la fila
        if entrada and costo_u_entrada is not None:
            esperado = entrada * costo_u_entrada
            if abs(esperado - costo_t_entrada) > Decimal("0.02"):
                self._error(
                    numero,
                    20,
                    "Costo total de entrada no coincide con cantidad por costo unitario.",
                )
        if salida and costo_u_salida is not None:
            esperado = salida * costo_u_salida
            if abs(esperado - costo_t_salida) > Decimal("0.02"):
                self._error(
                    numero, 23, "Costo total de salida no coincide con cantidad por costo unitario."
                )
        if saldo and costo_u_saldo is not None:
            esperado = saldo * costo_u_saldo
            if abs(esperado - costo_t_saldo) > Decimal("0.02"):
                self._error(
                    numero, 26, "Costo total de saldo no coincide con cantidad por costo unitario."
                )

        # Saldo acumulado por establecimiento, catálogo, tipo y código.
        grupo = (campo(4), campo(5), campo(6), campo(7))
        anterior_qty, anterior_total = self._saldos.get(grupo, (Decimal("0"), Decimal("0")))
        esperado_qty = anterior_qty + entrada + salida
        esperado_total = anterior_total + costo_t_entrada + costo_t_salida
        if abs(esperado_qty - saldo) > Decimal("0.0001"):
            self._error(
                numero, 24, "Saldo de cantidad inconsistente con los movimientos del producto."
            )
        if abs(esperado_total - costo_t_saldo) > Decimal("0.02"):
            self._error(
                numero, 26, "Saldo valorizado inconsistente con los movimientos del producto."
            )
        self._saldos[grupo] = (saldo, costo_t_saldo)

    def _decimal(self, valor):
        if valor is None or valor == "":
            return None
        if "," in valor or " " in valor:
            return None
        try:
            return Decimal(valor)
        except (InvalidOperation, ValueError):
            return None

    def _formato_decimal(self, valor, enteros, decimales):
        if not valor:
            return False
        return bool(
            re.fullmatch(
                rf"-?\d{{1,{enteros}}}\.\d{{{decimales}}}",
                valor,
            )
        )

    def _parse_fecha(self, valor):
        try:
            return datetime.strptime(valor, "%d/%m/%Y").date()
        except (TypeError, ValueError):
            return None
