from rest_framework import serializers

from apps.catalogo.models import CategoriaProducto, LoteSerie, Producto


class CategoriaProductoSerializer(serializers.ModelSerializer):
    parent_nombre = serializers.CharField(source="parent.nombre", read_only=True)

    class Meta:
        model = CategoriaProducto
        fields = [
            "id",
            "nombre",
            "parent",
            "parent_nombre",
            "cuenta_contable_inventario",
            "cuenta_contable_costo_venta",
            "activo",
        ]
        read_only_fields = ["id"]

    def validate_parent(self, parent):
        request = self.context.get("request")
        if parent and request and hasattr(request, "empresa"):
            if parent.empresa_id != request.empresa.id:
                raise serializers.ValidationError("La categoría padre es de otra empresa.")
        return parent


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source="categoria.nombre", read_only=True)
    tipo_existencia_display = serializers.CharField(
        source="get_tipo_existencia_display", read_only=True
    )
    unidad_medida_display = serializers.CharField(
        source="get_unidad_medida_display", read_only=True
    )
    metodo_valuacion_display = serializers.CharField(
        source="get_metodo_valuacion_display", read_only=True
    )

    class Meta:
        model = Producto
        fields = [
            "id",
            "sku",
            "codigo_barras",
            "descripcion",
            "categoria",
            "categoria_nombre",
            "tipo_existencia",
            "tipo_existencia_display",
            "unidad_medida",
            "unidad_medida_display",
            "catalogo_tipo",
            "codigo_propio_sunat",
            "catalogo_internacional",
            "codigo_internacional",
            "cubso_osce",
            "metodo_valuacion",
            "metodo_valuacion_display",
            "control_lotes",
            "control_series",
            "stock_minimo",
            "stock_maximo",
            "punto_reorden",
            "atributos_extra",
            "activo",
        ]
        read_only_fields = ["id"]

    def validate_categoria(self, categoria):
        request = self.context.get("request")
        if categoria and request and hasattr(request, "empresa"):
            if categoria.empresa_id != request.empresa.id:
                raise serializers.ValidationError("La categoría es de otra empresa.")
        return categoria

    def validate(self, attrs):
        if attrs.get("control_lotes") and attrs.get("control_series"):
            raise serializers.ValidationError(
                "No se puede controlar lotes y series simultáneamente."
            )
        if attrs.get("catalogo_internacional") == "9":
            raise serializers.ValidationError(
                {"catalogo_internacional": "El catálogo internacional no admite 9."}
            )
        if bool(attrs.get("catalogo_internacional")) != bool(attrs.get("codigo_internacional")):
            raise serializers.ValidationError(
                "Catálogo y código internacional deben registrarse juntos."
            )
        return attrs


class LoteSerieSerializer(serializers.ModelSerializer):
    producto_sku = serializers.CharField(source="producto.sku", read_only=True)
    producto_descripcion = serializers.CharField(source="producto.descripcion", read_only=True)

    class Meta:
        model = LoteSerie
        fields = [
            "id",
            "producto",
            "producto_sku",
            "producto_descripcion",
            "numero_lote_serie",
            "fecha_fabricacion",
            "fecha_vencimiento",
            "estado",
            "activo",
        ]
        read_only_fields = ["id"]

    def validate_producto(self, producto):
        request = self.context.get("request")
        if request and hasattr(request, "empresa"):
            if producto.empresa_id != request.empresa.id:
                raise serializers.ValidationError("El producto es de otra empresa.")
        return producto
