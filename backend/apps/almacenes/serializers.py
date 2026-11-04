import re

from rest_framework import serializers

from apps.almacenes.models import Almacen, Ubicacion


class AlmacenSerializer(serializers.ModelSerializer):
    codigo_sunat = serializers.CharField(read_only=True)
    ubicaciones_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Almacen
        fields = [
            "id",
            "codigo",
            "codigo_establecimiento",
            "codigo_correlativo",
            "codigo_sunat",
            "nombre",
            "direccion",
            "ubigeo",
            "es_almacen_tercero",
            "activo",
            "ubicaciones_count",
        ]
        read_only_fields = ["id"]

    def validate_codigo_establecimiento(self, value):
        if not re.fullmatch(r"\d{4}", value or ""):
            raise serializers.ValidationError("Debe tener exactamente 4 dígitos.")
        return value

    def validate_codigo_correlativo(self, value):
        if value and not re.fullmatch(r"\d{3}", value):
            raise serializers.ValidationError("Debe tener exactamente 3 dígitos.")
        return value or None

    def validate(self, attrs):
        if attrs.get("es_almacen_tercero"):
            attrs["codigo_establecimiento"] = "9999"
        return attrs


class UbicacionSerializer(serializers.ModelSerializer):
    almacen_nombre = serializers.CharField(source="almacen.nombre", read_only=True)
    almacen_codigo = serializers.CharField(source="almacen.codigo", read_only=True)

    class Meta:
        model = Ubicacion
        fields = [
            "id",
            "almacen",
            "almacen_nombre",
            "almacen_codigo",
            "codigo",
            "descripcion",
            "capacidad_peso_kg",
            "capacidad_volumen_m3",
            "activo",
        ]
        read_only_fields = ["id"]

    def validate_almacen(self, almacen):
        request = self.context.get("request")
        if request and hasattr(request, "empresa") and almacen.empresa_id != request.empresa.id:
            raise serializers.ValidationError("El almacén pertenece a otra empresa.")
        return almacen
