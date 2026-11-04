from rest_framework import serializers

from apps.sunat_ple.models import ExportacionPLE


class PleParametrosSerializer(serializers.Serializer):
    libro = serializers.ChoiceField(choices=["12.1", "13.1"])
    anio = serializers.IntegerField(min_value=2000, max_value=2100)
    mes = serializers.IntegerField(min_value=1, max_value=12)
    almacen = serializers.UUIDField(required=False, allow_null=True)


class PlePreviewSerializer(serializers.Serializer):
    libro = serializers.CharField()
    periodo = serializers.CharField()
    nombre_archivo = serializers.CharField()
    cantidad_registros = serializers.IntegerField()
    lineas = serializers.ListField(child=serializers.CharField())
    total_lineas = serializers.IntegerField()
    errores = serializers.ListField(child=serializers.DictField())


class ExportacionPleSerializer(serializers.ModelSerializer):
    usuario_email = serializers.CharField(source="generado_por.email", read_only=True)

    class Meta:
        model = ExportacionPLE
        fields = [
            "id",
            "libro",
            "anio",
            "mes",
            "nombre_archivo",
            "hash_sha256",
            "cantidad_registros",
            "errores",
            "usuario_email",
            "creado_en",
        ]
