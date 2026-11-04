import django_filters
from rest_framework import serializers

from apps.almacenes.models import Almacen, Ubicacion
from apps.catalogo.models import LoteSerie, Producto
from apps.core.sunat import TIPOS_OPERACION
from apps.movimientos.models import (
    EventoMovimiento,
    MovimientoDetalle,
    MovimientoInventario,
)
from apps.movimientos.services import MovimientoService


class MovimientoDetalleSerializer(serializers.ModelSerializer):
    producto_sku = serializers.CharField(source="producto.sku", read_only=True)
    producto_descripcion = serializers.CharField(source="producto.descripcion", read_only=True)
    ubicacion_codigo = serializers.CharField(source="ubicacion.codigo", read_only=True)
    ubicacion_destino_codigo = serializers.CharField(
        source="ubicacion_destino.codigo", read_only=True
    )
    lote_numero = serializers.CharField(source="lote_serie.numero_lote_serie", read_only=True)

    class Meta:
        model = MovimientoDetalle
        fields = [
            "id",
            "producto",
            "producto_sku",
            "producto_descripcion",
            "ubicacion",
            "ubicacion_codigo",
            "ubicacion_destino",
            "ubicacion_destino_codigo",
            "lote_serie",
            "lote_numero",
            "cantidad",
            "costo_unitario",
            "costo_total",
        ]
        read_only_fields = ["id", "producto_sku", "producto_descripcion"]


class MovimientoSerializer(serializers.ModelSerializer):
    tipo_operacion_sunat = serializers.ChoiceField(choices=TIPOS_OPERACION, required=False)
    detalles = MovimientoDetalleSerializer(many=True)
    almacen_nombre = serializers.CharField(source="almacen.nombre", read_only=True)
    almacen_destino_nombre = serializers.CharField(source="almacen_destino.nombre", read_only=True)
    tipo_movimiento_display = serializers.CharField(
        source="get_tipo_movimiento_display", read_only=True
    )
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    tipo_operacion_display = serializers.CharField(
        source="get_tipo_operacion_sunat_display", read_only=True
    )
    tipo_comprobante_display = serializers.CharField(
        source="get_tipo_comprobante_sunat_display", read_only=True
    )

    class Meta:
        model = MovimientoInventario
        fields = [
            "id",
            "correlativo_interno",
            "tipo_movimiento",
            "tipo_movimiento_display",
            "direccion_ajuste",
            "tipo_operacion_sunat",
            "tipo_operacion_display",
            "tipo_comprobante_sunat",
            "tipo_comprobante_display",
            "serie_comprobante",
            "numero_comprobante",
            "fecha_operacion",
            "fecha_documento",
            "almacen",
            "almacen_nombre",
            "almacen_destino",
            "almacen_destino_nombre",
            "cuo_contable",
            "correlativo_asiento",
            "estado_sunat",
            "glosa",
            "estado",
            "estado_display",
            "idempotency_key",
            "external_id",
            "movimiento_reverso_de",
            "detalles",
            "creado_en",
            "confirmado_en",
        ]
        read_only_fields = [
            "id",
            "correlativo_interno",
            "cuo_contable",
            "estado",
            "movimiento_reverso_de",
            "creado_en",
            "confirmado_en",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        empresa = getattr(request, "empresa", None) if request else None
        if empresa:
            self.fields["almacen"].queryset = Almacen.objects.filter(empresa=empresa, activo=True)
            self.fields["almacen_destino"].queryset = Almacen.objects.filter(
                empresa=empresa, activo=True
            )
            self.fields["detalles"].child.fields["producto"].queryset = Producto.objects.filter(
                empresa=empresa, activo=True
            )
            self.fields["detalles"].child.fields["ubicacion"].queryset = Ubicacion.objects.filter(
                almacen__empresa=empresa, activo=True
            )
            self.fields["detalles"].child.fields[
                "ubicacion_destino"
            ].queryset = Ubicacion.objects.filter(almacen__empresa=empresa, activo=True)
            self.fields["detalles"].child.fields["lote_serie"].queryset = LoteSerie.objects.filter(
                producto__empresa=empresa, activo=True
            )

    def validate(self, attrs):
        tipo = attrs.get("tipo_movimiento", getattr(self.instance, "tipo_movimiento", None))
        if "tipo_movimiento" in attrs or self.instance is None:
            if tipo == MovimientoInventario.Tipo.TRANSFERENCIA:
                destino = attrs.get(
                    "almacen_destino",
                    getattr(self.instance, "almacen_destino", None),
                )
                if not destino:
                    raise serializers.ValidationError(
                        {"almacen_destino": "La transferencia requiere almacén destino."}
                    )
            else:
                attrs["almacen_destino"] = None

        if "direccion_ajuste" in attrs or "tipo_movimiento" in attrs or self.instance is None:
            if tipo == MovimientoInventario.Tipo.AJUSTE:
                direccion = attrs.get(
                    "direccion_ajuste",
                    getattr(self.instance, "direccion_ajuste", ""),
                )
                if direccion not in ("ENTRADA", "SALIDA"):
                    raise serializers.ValidationError(
                        {"direccion_ajuste": ("El ajuste requiere dirección ENTRADA o SALIDA.")}
                    )
            else:
                attrs["direccion_ajuste"] = ""
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        return MovimientoService.crear_borrador(request.empresa, request.user, dict(validated_data))

    def update(self, instance, validated_data):
        request = self.context["request"]
        return MovimientoService.actualizar_borrador(instance, request.user, dict(validated_data))


class MovimientoListSerializer(serializers.ModelSerializer):
    tipo_movimiento_display = serializers.CharField(
        source="get_tipo_movimiento_display", read_only=True
    )
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    almacen_nombre = serializers.CharField(source="almacen.nombre", read_only=True)

    class Meta:
        model = MovimientoInventario
        fields = [
            "id",
            "correlativo_interno",
            "tipo_movimiento",
            "tipo_movimiento_display",
            "fecha_operacion",
            "almacen",
            "almacen_nombre",
            "almacen_destino",
            "tipo_operacion_sunat",
            "tipo_comprobante_sunat",
            "serie_comprobante",
            "numero_comprobante",
            "glosa",
            "estado",
            "estado_display",
            "creado_en",
        ]


class EventoMovimientoSerializer(serializers.ModelSerializer):
    usuario_email = serializers.CharField(source="usuario.email", read_only=True)

    class Meta:
        model = EventoMovimiento
        fields = ["id", "accion", "usuario_email", "detalle", "creado_en"]


class MovimientoFilter(django_filters.FilterSet):
    fecha_desde = django_filters.DateFilter(field_name="fecha_operacion", lookup_expr="gte")
    fecha_hasta = django_filters.DateFilter(field_name="fecha_operacion", lookup_expr="lte")

    class Meta:
        model = MovimientoInventario
        fields = [
            "tipo_movimiento",
            "estado",
            "almacen",
            "almacen_destino",
            "tipo_operacion_sunat",
            "estado_sunat",
        ]
