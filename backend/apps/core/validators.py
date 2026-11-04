import re

from django.core.exceptions import ValidationError

RUC_PREFIJOS = ("10", "15", "17", "20")


def validar_ruc(valor: str) -> None:
    """Valida formato y dígito verificador del RUC peruano (módulo 11)."""
    if not valor or not re.fullmatch(r"\d{11}", valor):
        raise ValidationError("El RUC debe tener 11 dígitos numéricos.")
    if valor[:2] not in RUC_PREFIJOS:
        raise ValidationError("El RUC debe comenzar con 10, 15, 17 o 20.")
    if len(set(valor)) == 1:
        raise ValidationError("El RUC no es válido.")

    pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    suma = sum(int(digito) * peso for digito, peso in zip(valor[:10], pesos, strict=False))
    resto = suma % 11
    digito = 11 - resto
    if digito == 10:
        digito = 0
    elif digito == 11:
        digito = 1
    if digito != int(valor[10]):
        raise ValidationError("El dígito verificador del RUC no es válido.")


def validar_ubigeo(valor: str) -> None:
    if valor and not re.fullmatch(r"\d{6}", valor):
        raise ValidationError("El ubigeo debe tener 6 dígitos.")
