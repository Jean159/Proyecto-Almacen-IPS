from datetime import timedelta

from django.db.models import F, Sum
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.common.permissions import PuedeLeer, PuedePle
from apps.common.views import EmpresaScopedAPIView, EmpresaScopedViewSetMixin
from apps.core.models import CierrePeriodo, Empresa, SunatTabla
from apps.core.serializers import (
    CierrePeriodoSerializer,
    DashboardKpisSerializer,
    EmpresaSerializer,
    LoginSerializer,
    MeSerializer,
    SunatTablaSerializer,
)
from apps.core.tenancy import empresa_del_usuario


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer


class MeView(APIView):
    @extend_schema(responses=MeSerializer)
    def get(self, request):
        return Response(MeSerializer(request.user).data)


class EmpresaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EmpresaSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["ruc", "razon_social", "nombre_comercial"]
    ordering_fields = ["razon_social", "creado_en"]

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Empresa.objects.none()
        return empresa_del_usuario(self.request.user).order_by("razon_social")


class SunatTablaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SunatTablaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["tabla_numero", "activo"]
    search_fields = ["codigo", "descripcion"]
    ordering_fields = ["tabla_numero", "codigo"]

    def get_queryset(self):
        return SunatTabla.objects.filter(activo=True)


class CierrePeriodoViewSet(EmpresaScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = CierrePeriodoSerializer
    filterset_fields = ["anio", "mes", "estado"]
    ordering_fields = ["anio", "mes", "creado_en"]

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), PuedePle()]

    def get_queryset(self):
        return self.filtrar_empresa(CierrePeriodo.objects.select_related("empresa", "cerrado_por"))

    def perform_create(self, serializer):
        estado = serializer.validated_data.get("estado", CierrePeriodo.Estado.CERRADO)
        guardar = {"empresa": self.get_empresa()}
        if estado == CierrePeriodo.Estado.CERRADO:
            guardar["cerrado_por"] = self.request.user
            guardar["cerrado_en"] = timezone.now()
        serializer.save(**guardar)

    @action(detail=True, methods=["post"])
    def cerrar(self, request, pk=None):
        cierre = self.get_object()
        cierre.estado = CierrePeriodo.Estado.CERRADO
        cierre.cerrado_por = request.user
        cierre.cerrado_en = timezone.now()
        cierre.save(update_fields=["estado", "cerrado_por", "cerrado_en", "actualizado_en"])
        return Response(self.get_serializer(cierre).data)

    @action(detail=True, methods=["post"])
    def abrir(self, request, pk=None):
        cierre = self.get_object()
        cierre.estado = CierrePeriodo.Estado.ABIERTO
        cierre.cerrado_por = None
        cierre.cerrado_en = None
        cierre.save(update_fields=["estado", "cerrado_por", "cerrado_en", "actualizado_en"])
        return Response(self.get_serializer(cierre).data)


class DashboardView(EmpresaScopedAPIView):
    permission_classes = [permissions.IsAuthenticated, PuedeLeer]

    @extend_schema(responses=DashboardKpisSerializer)
    def get(self, request):
        from apps.inventario.models import StockSaldo
        from apps.kardex.models import SaldoKardex
        from apps.movimientos.models import MovimientoInventario
        from apps.sunat_ple.models import ExportacionPLE

        empresa = self.get_empresa()
        hoy = timezone.localdate()
        saldos = SaldoKardex.objects.filter(empresa=empresa)
        valor = saldos.aggregate(valor=Sum("costo_total"), unidades=Sum("cantidad"))
        bajo_minimo = (
            StockSaldo.objects.filter(
                almacen__empresa=empresa,
                cantidad_fisica__lt=F("producto__stock_minimo"),
            )
            .values("producto_id")
            .distinct()
            .count()
        )
        por_vencer = StockSaldo.objects.filter(
            almacen__empresa=empresa,
            lote_serie__fecha_vencimiento__gte=hoy,
            lote_serie__fecha_vencimiento__lte=hoy + timedelta(days=30),
        ).count()
        movimientos_mes = MovimientoInventario.objects.filter(
            empresa=empresa,
            fecha_operacion__year=hoy.year,
            fecha_operacion__month=hoy.month,
        ).count()
        ultimos = list(
            MovimientoInventario.objects.filter(empresa=empresa)
            .order_by("-creado_en")[:5]
            .values(
                "id",
                "correlativo_interno",
                "tipo_movimiento",
                "fecha_operacion",
                "estado",
                "glosa",
            )
        )
        stock_por_almacen = list(
            saldos.values("almacen__codigo", "almacen__nombre")
            .annotate(cantidad=Sum("cantidad"), valor=Sum("costo_total"))
            .order_by("almacen__codigo")
        )
        exportaciones = ExportacionPLE.objects.filter(
            empresa=empresa, anio=hoy.year, mes=hoy.month
        ).count()
        return Response(
            {
                "valor_inventario": valor["valor"] or 0,
                "unidades_stock": valor["unidades"] or 0,
                "productos_bajo_minimo": bajo_minimo,
                "lotes_por_vencer_30d": por_vencer,
                "movimientos_mes": movimientos_mes,
                "exportaciones_ple_mes": exportaciones,
                "ultimos_movimientos": ultimos,
                "stock_por_almacen": stock_por_almacen,
            }
        )
