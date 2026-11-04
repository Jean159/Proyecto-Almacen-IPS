from rest_framework import permissions, viewsets

from apps.catalogo.models import CategoriaProducto, LoteSerie, Producto
from apps.catalogo.serializers import (
    CategoriaProductoSerializer,
    LoteSerieSerializer,
    ProductoSerializer,
)
from apps.common.permissions import PuedeEscribir, PuedeLeer
from apps.common.views import EmpresaScopedViewSetMixin


class CategoriaProductoViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = CategoriaProductoSerializer
    filterset_fields = ["activo", "parent"]
    search_fields = ["nombre"]
    ordering_fields = ["nombre", "creado_en"]

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [permissions.IsAuthenticated(), PuedeLeer()]
        return [permissions.IsAuthenticated(), PuedeEscribir()]

    def get_queryset(self):
        return self.filtrar_empresa(CategoriaProducto.objects.select_related("parent"))

    def perform_create(self, serializer):
        serializer.save(empresa=self.get_empresa())


class ProductoViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ProductoSerializer
    filterset_fields = [
        "activo",
        "categoria",
        "control_lotes",
        "control_series",
        "metodo_valuacion",
    ]
    search_fields = ["sku", "codigo_barras", "descripcion", "codigo_propio_sunat"]
    ordering_fields = ["descripcion", "sku", "creado_en"]

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [permissions.IsAuthenticated(), PuedeLeer()]
        return [permissions.IsAuthenticated(), PuedeEscribir()]

    def get_queryset(self):
        return self.filtrar_empresa(Producto.objects.select_related("categoria"))

    def perform_create(self, serializer):
        serializer.save(empresa=self.get_empresa())


class LoteSerieViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = LoteSerieSerializer
    empresa_lookup = "producto__empresa"
    filterset_fields = ["producto", "estado", "activo"]
    search_fields = ["numero_lote_serie", "producto__sku", "producto__descripcion"]
    ordering_fields = ["fecha_vencimiento", "numero_lote_serie", "creado_en"]

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [permissions.IsAuthenticated(), PuedeLeer()]
        return [permissions.IsAuthenticated(), PuedeEscribir()]

    def get_queryset(self):
        return self.filtrar_empresa(LoteSerie.objects.select_related("producto"))
