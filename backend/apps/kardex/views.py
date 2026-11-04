import io

from django.http import HttpResponse
from openpyxl import Workbook
from rest_framework import permissions, viewsets
from rest_framework.decorators import action

from apps.common.permissions import PuedeLeer
from apps.common.views import EmpresaScopedViewSetMixin
from apps.kardex.models import KardexValorizado, SaldoKardex
from apps.kardex.serializers import (
    KardexFilaSerializer,
    KardexFilter,
    KardexFisicoSerializer,
    SaldoKardexSerializer,
)


class KardexViewSet(EmpresaScopedViewSetMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = KardexFilaSerializer
    filterset_class = KardexFilter
    search_fields = ["producto__sku", "producto__descripcion", "cuo_contable"]
    ordering_fields = ["fecha_operacion", "secuencia", "id"]

    def get_permissions(self):
        return [permissions.IsAuthenticated(), PuedeLeer()]

    def get_queryset(self):
        return self.filtrar_empresa(KardexValorizado.objects.select_related("almacen", "producto"))

    @action(detail=False, methods=["get"])
    def fisico(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(KardexFisicoSerializer(page, many=True).data)
        return self.get_paginated_response(KardexFisicoSerializer(queryset, many=True).data)

    @action(detail=False, methods=["get"])
    def export(self, request):
        modo = request.query_params.get("modo", "valorizado")
        queryset = self.filter_queryset(self.get_queryset())[:10000]
        wb = Workbook()
        ws = wb.active
        if modo == "fisico":
            ws.title = "Kardex 12.1"
            headers = [
                "Fecha",
                "Operación",
                "Comprobante",
                "Producto",
                "Almacén",
                "Entradas",
                "Salidas",
                "Saldo",
            ]
            ws.append(headers)
            for fila in queryset:
                ws.append(
                    [
                        fila.fecha_operacion.isoformat(),
                        fila.tipo_operacion,
                        f"{fila.serie_comprobante}-{fila.numero_comprobante}",
                        fila.producto.sku,
                        fila.almacen.codigo,
                        float(fila.cantidad_entrada),
                        -float(fila.cantidad_salida),
                        float(fila.cantidad_saldo),
                    ]
                )
        else:
            ws.title = "Kardex 13.1"
            headers = [
                "Fecha",
                "Operación",
                "Comprobante",
                "Producto",
                "Almacén",
                "Cant. entrada",
                "Costo unit. entrada",
                "Total entrada",
                "Cant. salida",
                "Costo unit. salida",
                "Total salida",
                "Cant. saldo",
                "Costo unit. saldo",
                "Total saldo",
            ]
            ws.append(headers)
            for fila in queryset:
                ws.append(
                    [
                        fila.fecha_operacion.isoformat(),
                        fila.tipo_operacion,
                        f"{fila.serie_comprobante}-{fila.numero_comprobante}",
                        fila.producto.sku,
                        fila.almacen.codigo,
                        float(fila.cantidad_entrada),
                        float(fila.costo_unitario_entrada),
                        float(fila.costo_total_entrada),
                        -float(fila.cantidad_salida),
                        float(fila.costo_unitario_salida),
                        -float(fila.costo_total_salida),
                        float(fila.cantidad_saldo),
                        float(fila.costo_unitario_saldo),
                        float(fila.costo_total_saldo),
                    ]
                )
        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        response = HttpResponse(
            buffer.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="kardex_{modo}.xlsx"'
        return response


class SaldoKardexViewSet(EmpresaScopedViewSetMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = SaldoKardexSerializer
    filterset_fields = ["almacen", "producto"]
    search_fields = ["producto__sku", "producto__descripcion"]
    ordering_fields = ["cantidad", "costo_total", "actualizado_en"]

    def get_permissions(self):
        return [permissions.IsAuthenticated(), PuedeLeer()]

    def get_queryset(self):
        return self.filtrar_empresa(
            SaldoKardex.objects.select_related("almacen", "producto").order_by(
                "almacen__codigo", "producto__sku"
            )
        )
