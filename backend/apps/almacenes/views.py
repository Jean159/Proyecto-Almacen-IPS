from django.db.models import Count
from rest_framework import permissions, viewsets

from apps.almacenes.models import Almacen, Ubicacion
from apps.almacenes.serializers import AlmacenSerializer, UbicacionSerializer
from apps.common.permissions import PuedeEscribir, PuedeLeer
from apps.common.views import EmpresaScopedViewSetMixin


class AlmacenViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = AlmacenSerializer
    filterset_fields = ["activo", "es_almacen_tercero"]
    search_fields = ["codigo", "nombre", "direccion"]
    ordering_fields = ["nombre", "codigo", "creado_en"]

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [permissions.IsAuthenticated(), PuedeLeer()]
        return [permissions.IsAuthenticated(), PuedeEscribir()]

    def get_queryset(self):
        return self.filtrar_empresa(
            Almacen.objects.annotate(ubicaciones_count=Count("ubicaciones")).order_by("nombre")
        )

    def perform_create(self, serializer):
        serializer.save(empresa=self.get_empresa())


class UbicacionViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = UbicacionSerializer
    empresa_lookup = "almacen__empresa"
    filterset_fields = ["almacen", "activo"]
    search_fields = ["codigo", "descripcion"]
    ordering_fields = ["codigo", "creado_en"]

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [permissions.IsAuthenticated(), PuedeLeer()]
        return [permissions.IsAuthenticated(), PuedeEscribir()]

    def get_queryset(self):
        return self.filtrar_empresa(
            Ubicacion.objects.select_related("almacen").order_by("almacen", "codigo")
        )
