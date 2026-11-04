from datetime import timedelta

import django_filters
from django.db.models import F, Sum
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import PuedeEscribir, PuedeLeer
from apps.common.views import EmpresaScopedViewSetMixin
from apps.inventario.models import ReservaStock, SaldoPeriodo, StockSaldo
from apps.inventario.serializers import (
    ReservaStockSerializer,
    SaldoPeriodoSerializer,
    StockSaldoSerializer,
)
from apps.inventario.services import ReservaService


class StockSaldoFilter(django_filters.FilterSet):
    bajo_minimo = django_filters.BooleanFilter(method="filtrar_bajo_minimo")
    con_stock = django_filters.BooleanFilter(method="filtrar_con_stock")
    por_vencer = django_filters.BooleanFilter(method="filtrar_por_vencer")

    class Meta:
        model = StockSaldo
        fields = ["almacen", "producto", "ubicacion", "lote_serie"]

    def filtrar_bajo_minimo(self, queryset, name, value):
        if value:
            return queryset.filter(cantidad_fisica__lt=F("producto__stock_minimo"))
        return queryset

    def filtrar_con_stock(self, queryset, name, value):
        if value:
            return queryset.filter(cantidad_fisica__gt=0)
        return queryset

    def filtrar_por_vencer(self, queryset, name, value):
        if value:
            limite = timezone.localdate() + timedelta(days=30)
            return queryset.filter(
                lote_serie__fecha_vencimiento__isnull=False,
                lote_serie__fecha_vencimiento__lte=limite,
            )
        return queryset


class StockSaldoViewSet(EmpresaScopedViewSetMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = StockSaldoSerializer
    empresa_lookup = "almacen__empresa"
    filterset_class = StockSaldoFilter
    search_fields = ["producto__sku", "producto__descripcion", "almacen__nombre"]
    ordering_fields = ["cantidad_fisica", "ultima_actualizacion", "producto__sku"]

    def get_permissions(self):
        return [permissions.IsAuthenticated(), PuedeLeer()]

    def get_queryset(self):
        return self.filtrar_empresa(
            StockSaldo.objects.select_related(
                "almacen", "producto", "ubicacion", "lote_serie"
            ).order_by("almacen__codigo", "producto__sku", "ubicacion__codigo")
        )

    @action(detail=False, methods=["get"])
    def resumen(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        filas = (
            queryset.values("almacen_id", "producto_id")
            .annotate(
                cantidad_fisica=Sum("cantidad_fisica"),
                cantidad_reservada=Sum("cantidad_reservada"),
            )
            .order_by("almacen_id", "producto_id")
        )
        from apps.kardex.models import SaldoKardex

        saldos = {
            (s.almacen_id, s.producto_id): s
            for s in SaldoKardex.objects.filter(
                empresa=request.empresa,
                almacen_id__in={f["almacen_id"] for f in filas},
            )
        }
        data = []
        for fila in filas:
            saldo = saldos.get((fila["almacen_id"], fila["producto_id"]))
            data.append(
                {
                    **fila,
                    "cantidad_disponible": fila["cantidad_fisica"] - fila["cantidad_reservada"],
                    "costo_total": saldo.costo_total if saldo else 0,
                }
            )
        return Response(data)

    @action(detail=False, methods=["get"])
    def alertas(self, request):
        hoy = timezone.localdate()
        queryset = self.get_queryset()
        bajo_minimo = queryset.filter(
            cantidad_fisica__lt=F("producto__stock_minimo")
        ).select_related("producto", "almacen")
        por_vencer = queryset.filter(
            lote_serie__fecha_vencimiento__isnull=False,
            lote_serie__fecha_vencimiento__lte=hoy + timedelta(days=30),
        ).select_related("producto", "almacen", "lote_serie")
        return Response(
            {
                "bajo_minimo": StockSaldoSerializer(bajo_minimo, many=True).data,
                "por_vencer": StockSaldoSerializer(por_vencer, many=True).data,
            }
        )


class ReservaStockViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ReservaStockSerializer
    filterset_fields = ["almacen", "producto", "estado"]
    search_fields = ["producto__sku", "referencia"]
    ordering_fields = ["creado_en", "expira_en"]

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [permissions.IsAuthenticated(), PuedeLeer()]
        return [permissions.IsAuthenticated(), PuedeEscribir()]

    def get_queryset(self):
        return self.filtrar_empresa(ReservaStock.objects.select_related("almacen", "producto"))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reserva = ReservaService.crear(self.get_empresa(), request.user, serializer.validated_data)
        salida = self.get_serializer(reserva)
        return Response(salida.data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        ReservaService.liberar(instance, self.request.user)
        instance.delete()

    @action(detail=True, methods=["post"])
    def liberar(self, request, pk=None):
        reserva = ReservaService.liberar(self.get_object(), request.user)
        return Response(self.get_serializer(reserva).data)

    @action(detail=True, methods=["post"])
    def consumir(self, request, pk=None):
        reserva = ReservaService.consumir(self.get_object(), request.user)
        return Response(self.get_serializer(reserva).data)


class SaldoPeriodoViewSet(EmpresaScopedViewSetMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = SaldoPeriodoSerializer
    filterset_fields = ["almacen", "producto", "periodo"]
    search_fields = ["producto__sku", "producto__descripcion"]
    ordering_fields = ["periodo", "producto__sku"]

    def get_permissions(self):
        return [permissions.IsAuthenticated(), PuedeLeer()]

    def get_queryset(self):
        return self.filtrar_empresa(SaldoPeriodo.objects.select_related("almacen", "producto"))
