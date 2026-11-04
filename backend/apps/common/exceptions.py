from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler


class Conflicto(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "La operación entra en conflicto con el estado actual."
    default_code = "conflicto"


class StockInsuficiente(Conflicto):
    default_detail = "Stock insuficiente para completar la operación."
    default_code = "stock_insuficiente"


class PeriodoCerrado(Conflicto):
    default_detail = "El periodo contable está cerrado."
    default_code = "periodo_cerrado"


class MovimientoInvalido(Conflicto):
    default_detail = "El movimiento no puede procesarse en su estado actual."
    default_code = "movimiento_invalido"


class RetroactividadNoPermitida(Conflicto):
    default_detail = "No se permiten movimientos anteriores al último kardex del producto."
    default_code = "retroactividad_no_permitida"


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    data = response.data
    codigo = getattr(exc, "default_code", "error")
    if isinstance(data, dict):
        if "detail" in data and len(data) == 1:
            response.data = {
                "detail": data["detail"],
                "codigo": codigo,
                "campos": {},
            }
        elif "detail" not in data:
            response.data = {
                "detail": "Error de validación.",
                "codigo": codigo,
                "campos": data,
            }
    elif isinstance(data, list):
        response.data = {
            "detail": "Error de validación.",
            "codigo": codigo,
            "campos": {"non_field_errors": data},
        }
    return response
