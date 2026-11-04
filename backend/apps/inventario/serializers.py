from rest_framework import serializers

from apps.inventario.models import ReservaStock, SaldoPeriodo, StockSaldo


class StockSaldoSerializer(serializers.ModelSerializer):
    producto_sku = serializers.CharField(source="producto.sku", read_only=True)
    producto_descripcion = serializers.CharField(source="producto.descripcion", read_only=True)
    almacen_codigo = serializers.CharField(source="almacen.codigo", read_only=True)
    almacen_nombre = serializers.CharField(source="almacen.nombre", read_only=True)
    ubicacion_codigo = serializers.CharField(source="ubicacion.codigo", read_only=True)
    lote_numero = serializers.CharField(source="lote_serie.numero_lote_serie", read_only=True)
    lote_fecha_vencimiento = serializers.DateField(
        source="lote_serie.fecha_vencimiento", read_only=True
    )
    cantidad_disponible = serializers.DecimalField(max_digits=18, decimal_places=4, read_only=True)
    bajo_minimo = serializers.SerializerMethodField()

    class Meta:
        model = StockSaldo
        fields = [
            "id",
            "almacen",
            "almacen_codigo",
            "almacen_nombre",
            "producto",
            "producto_sku",
            "producto_descripcion",
            "ubicacion",
            "ubicacion_codigo",
            "lote_serie",
            "lote_numero",
            "lote_fecha_vencimiento",
            "cantidad_fisica",
            "cantidad_reservada",
            "cantidad_disponible",
            "bajo_minimo",
            "ultima_actualizacion",
        ]

    def get_bajo_minimo(self, obj) -> bool:
        return obj.cantidad_fisica < obj.producto.stock_minimo


class ReservaStockSerializer(serializers.ModelSerializer):
    producto_sku = serializers.CharField(source="producto.sku", read_only=True)
    almacen_nombre = serializers.CharField(source="almacen.nombre", read_only=True)

    class Meta:
        model = ReservaStock
        fields = [
            "id",
            "almacen",
            "almacen_nombre",
            "producto",
            "producto_sku",
            "ubicacion",
            "lote_serie",
            "cantidad",
            "estado",
            "expira_en",
            "referencia",
            "creado_por",
            "creado_en",
        ]
        read_only_fields = ["id", "creado_por", "creado_en"]

    def validate(self, attrs):
        request = self.context.get("request")
        almacen = attrs.get("almacen") or getattr(self.instance, "almacen", None)
        producto = attrs.get("producto") or getattr(self.instance, "producto", None)
        ubicacion = attrs.get("ubicacion") or getattr(self.instance, "ubicacion", None)
        lote = attrs.get("lote_serie") or getattr(self.instance, "lote_serie", None)
        if request and hasattr(request, "empresa"):
            if almacen and almacen.empresa_id != request.empresa.id:
                raise serializers.ValidationError("El almacén es de otra empresa.")
            if producto and producto.empresa_id != request.empresa.id:
                raise serializers.ValidationError("El producto es de otra empresa.")
        if ubicacion and almacen and ubicacion.almacen_id != almacen.id:
            raise serializers.ValidationError("La ubicación no corresponde al almacén.")
        if lote and producto and lote.producto_id != producto.id:
            raise serializers.ValidationError("El lote no corresponde al producto.")
        return attrs


class SaldoPeriodoSerializer(serializers.ModelSerializer):
    producto_sku = serializers.CharField(source="producto.sku", read_only=True)
    almacen_codigo = serializers.CharField(source="almacen.codigo", read_only=True)

    class Meta:
        model = SaldoPeriodo
        fields = [
            "id",
            "almacen",
            "almacen_codigo",
            "producto",
            "producto_sku",
            "periodo",
            "cantidad",
            "costo_total",
            "costo_unitario",
            "generado_en",
        ]
