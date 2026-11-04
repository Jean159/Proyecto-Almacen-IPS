from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.core.models import (
    CierrePeriodo,
    Empresa,
    SunatTabla,
    Usuario,
    UsuarioEmpresa,
)
from apps.core.tenancy import empresa_del_usuario


class UsuarioSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.CharField(read_only=True)

    class Meta:
        model = Usuario
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "nombre_completo",
            "telefono",
            "is_active",
        ]
        read_only_fields = ["id", "is_active"]


class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = [
            "id",
            "ruc",
            "razon_social",
            "nombre_comercial",
            "es_oficial",
            "moneda_principal",
            "activo",
        ]
        read_only_fields = ["id"]


class UsuarioEmpresaSerializer(serializers.ModelSerializer):
    empresa = EmpresaSerializer(read_only=True)

    class Meta:
        model = UsuarioEmpresa
        fields = ["id", "empresa", "rol", "activo"]


class MeSerializer(UsuarioSerializer):
    empresas = serializers.SerializerMethodField()

    class Meta(UsuarioSerializer.Meta):
        fields = UsuarioSerializer.Meta.fields + ["empresas"]

    @extend_schema_field(UsuarioEmpresaSerializer(many=True))
    def get_empresas(self, obj):
        membresias = UsuarioEmpresa.objects.filter(
            usuario=obj, activo=True, empresa__activo=True
        ).select_related("empresa")
        return UsuarioEmpresaSerializer(membresias, many=True).data


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data["usuario"] = UsuarioSerializer(self.user).data
        data["empresas"] = EmpresaSerializer(empresa_del_usuario(self.user), many=True).data
        return data


class SunatTablaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SunatTabla
        fields = [
            "id",
            "tabla_numero",
            "codigo",
            "descripcion",
            "activo",
            "vigente_desde",
            "vigente_hasta",
        ]


class DashboardKpisSerializer(serializers.Serializer):
    valor_inventario = serializers.DecimalField(max_digits=18, decimal_places=2)
    unidades_stock = serializers.DecimalField(max_digits=18, decimal_places=4)
    productos_bajo_minimo = serializers.IntegerField()
    lotes_por_vencer_30d = serializers.IntegerField()
    movimientos_mes = serializers.IntegerField()
    exportaciones_ple_mes = serializers.IntegerField()
    ultimos_movimientos = serializers.ListField(child=serializers.DictField())
    stock_por_almacen = serializers.ListField(child=serializers.DictField())


class CierrePeriodoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CierrePeriodo
        fields = [
            "id",
            "anio",
            "mes",
            "estado",
            "cerrado_por",
            "cerrado_en",
            "creado_en",
        ]
        read_only_fields = ["id", "cerrado_por", "cerrado_en", "creado_en"]

    def validate(self, attrs):
        anio = attrs.get("anio", getattr(self.instance, "anio", None))
        mes = attrs.get("mes", getattr(self.instance, "mes", None))
        if anio and anio < 2000:
            raise serializers.ValidationError({"anio": "Año inválido."})
        if mes and not 1 <= mes <= 12:
            raise serializers.ValidationError({"mes": "Mes inválido."})
        return attrs
