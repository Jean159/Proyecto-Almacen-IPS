from rest_framework import serializers


class IntegracionEstadoSerializer(serializers.Serializer):
    servicio = serializers.CharField()
    estado = serializers.CharField()
    descripcion = serializers.CharField()
