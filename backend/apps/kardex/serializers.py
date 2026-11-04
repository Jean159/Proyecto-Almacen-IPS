import django_filters
from rest_framework import serializers

from apps.kardex.models import KardexValorizado, SaldoKardex


class KardexFilaSerializer(serializers.ModelSerializer):
    producto_sku = serializers.CharField(source="producto.sku", read_only=True)
    producto_descripcion = serializers.CharField(source="descripcion_producto", read_only=True)
    almacen_codigo = serializers.CharField(source="almacen.codigo", read_only=True)
    almacen_nombre = serializers.CharField(source="almacen.nombre", read_only=True)
    serie_numero = serializers.SerializerMethodField()
    metodo_valuacion_display = serializers.CharField(
        source="get_metodo_valuacion_display", read_only=True
    )

    class Meta:
        model = KardexValorizado
        fields = [
            "id",
            "periodo_aaaamm",
            "fecha_operacion",
            "tipo_operacion",
            "tipo_comprobante",
            "serie_comprobante",
            "numero_comprobante",
            "serie_numero",
            "cuo_contable",
            "producto",
            "producto_sku",
            "producto_descripcion",
            "almacen",
            "almacen_codigo",
            "almacen_nombre",
            "metodo_valuacion",
            "metodo_valuacion_display",
            "cantidad_entrada",
            "costo_unitario_entrada",
            "costo_total_entrada",
            "cantidad_salida",
            "costo_unitario_salida",
            "costo_total_salida",
            "cantidad_saldo",
            "costo_unitario_saldo",
            "costo_total_saldo",
            "estado_sunat",
        ]

    def get_serie_numero(self, obj) -> str:
        return f"{obj.serie_comprobante}-{obj.numero_comprobante}"


class KardexFisicoSerializer(serializers.ModelSerializer):
    producto_sku = serializers.CharField(source="producto.sku", read_only=True)
    producto_descripcion = serializers.CharField(source="descripcion_producto", read_only=True)
    almacen_codigo = serializers.CharField(source="almacen.codigo", read_only=True)
    serie_numero = serializers.SerializerMethodField()

    class Meta:
        model = KardexValorizado
        fields = [
            "id",
            "periodo_aaaamm",
            "fecha_operacion",
            "tipo_operacion",
            "tipo_comprobante",
            "serie_comprobante",
            "numero_comprobante",
            "serie_numero",
            "producto",
            "producto_sku",
            "producto_descripcion",
            "almacen",
            "almacen_codigo",
            "cantidad_entrada",
            "cantidad_salida",
            "cantidad_saldo",
            "estado_sunat",
        ]

    def get_serie_numero(self, obj) -> str:
        return f"{obj.serie_comprobante}-{obj.numero_comprobante}"


class SaldoKardexSerializer(serializers.ModelSerializer):
    producto_sku = serializers.CharField(source="producto.sku", read_only=True)
    producto_descripcion = serializers.CharField(source="producto.descripcion", read_only=True)
    almacen_codigo = serializers.CharField(source="almacen.codigo", read_only=True)
    almacen_nombre = serializers.CharField(source="almacen.nombre", read_only=True)

    class Meta:
        model = SaldoKardex
        fields = [
            "id",
            "almacen",
            "almacen_codigo",
            "almacen_nombre",
            "producto",
            "producto_sku",
            "producto_descripcion",
            "cantidad",
            "costo_unitario",
            "costo_total",
            "ultima_secuencia",
            "actualizado_en",
        ]


class KardexFilter(django_filters.FilterSet):
    desde = django_filters.DateFilter(field_name="fecha_operacion", lookup_expr="gte")
    hasta = django_filters.DateFilter(field_name="fecha_operacion", lookup_expr="lte")

    class Meta:
        model = KardexValorizado
        fields = ["producto", "almacen", "periodo_aaaamm", "tipo_operacion", "lado"]
