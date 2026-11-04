from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import (
    PuedeAnular,
    PuedeConfirmar,
    PuedeEscribir,
    PuedeLeer,
)
from apps.common.views import EmpresaScopedViewSetMixin
from apps.movimientos.models import MovimientoInventario
from apps.movimientos.serializers import (
    EventoMovimientoSerializer,
    MovimientoFilter,
    MovimientoListSerializer,
    MovimientoSerializer,
)
from apps.movimientos.services import MovimientoService


class MovimientoViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    filterset_class = MovimientoFilter
    search_fields = [
        "correlativo_interno",
        "glosa",
        "serie_comprobante",
        "numero_comprobante",
        "external_id",
    ]
    ordering_fields = ["fecha_operacion", "creado_en", "correlativo_interno"]

    def get_serializer_class(self):
        if self.action == "list":
            return MovimientoListSerializer
        return MovimientoSerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [permissions.IsAuthenticated(), PuedeLeer()]
        if self.action == "confirmar":
            return [permissions.IsAuthenticated(), PuedeConfirmar()]
        if self.action == "anular":
            return [permissions.IsAuthenticated(), PuedeAnular()]
        return [permissions.IsAuthenticated(), PuedeEscribir()]

    def get_queryset(self):
        qs = MovimientoInventario.objects.select_related(
            "almacen", "almacen_destino", "usuario_registro", "confirmado_por"
        )
        if self.action in {"retrieve", "confirmar", "anular"}:
            qs = qs.prefetch_related("detalles__producto", "detalles__lote_serie")
        return self.filtrar_empresa(qs)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        movimiento = serializer.save()
        salida = MovimientoSerializer(movimiento, context=self.get_serializer_context())
        return Response(salida.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=kwargs.get("partial", False)
        )
        serializer.is_valid(raise_exception=True)
        movimiento = serializer.save()
        salida = MovimientoSerializer(movimiento, context=self.get_serializer_context())
        return Response(salida.data)

    def perform_destroy(self, instance):
        if instance.estado != MovimientoInventario.Estado.BORRADOR:
            from rest_framework.exceptions import ValidationError

            raise ValidationError("Solo se pueden eliminar movimientos en borrador.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def confirmar(self, request, pk=None):
        movimiento = self.get_object()
        clave = request.headers.get("Idempotency-Key")
        movimiento = MovimientoService.confirmar(movimiento, request.user, clave)
        return Response(
            MovimientoSerializer(movimiento, context=self.get_serializer_context()).data
        )

    @action(detail=True, methods=["post"])
    def anular(self, request, pk=None):
        movimiento = self.get_object()
        reverso = MovimientoService.anular(movimiento, request.user)
        return Response(MovimientoSerializer(reverso, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["get"])
    def eventos(self, request, pk=None):
        movimiento = self.get_object()
        return Response(EventoMovimientoSerializer(movimiento.eventos.all(), many=True).data)
