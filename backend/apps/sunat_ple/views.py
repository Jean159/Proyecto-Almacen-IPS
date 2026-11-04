from django.conf import settings
from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response

from apps.almacenes.models import Almacen
from apps.common.permissions import PuedePle
from apps.common.views import EmpresaScopedAPIView
from apps.sunat_ple.models import ExportacionPLE
from apps.sunat_ple.serializers import (
    ExportacionPleSerializer,
    PleParametrosSerializer,
    PlePreviewSerializer,
)
from apps.sunat_ple.services import PleService


class PleBaseView(EmpresaScopedAPIView):
    permission_classes = [permissions.IsAuthenticated, PuedePle]

    def _parametros(self, request):
        serializer = PleParametrosSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data
        almacen = None
        if datos.get("almacen"):
            almacen = Almacen.objects.filter(empresa=request.empresa, pk=datos["almacen"]).first()
            if not almacen:
                from rest_framework.exceptions import ValidationError

                raise ValidationError({"almacen": "Almacén no encontrado."})
        return datos, almacen


class PlePreviewView(PleBaseView):
    @extend_schema(
        parameters=[PleParametrosSerializer],
        responses=PlePreviewSerializer,
    )
    def get(self, request):
        datos, almacen = self._parametros(request)
        resultado = PleService.generar(
            request.empresa,
            datos["libro"],
            datos["anio"],
            datos["mes"],
            almacen,
        )
        return Response(
            {
                "libro": resultado.libro,
                "periodo": f"{resultado.anio}{resultado.mes:02d}",
                "nombre_archivo": resultado.nombre_archivo,
                "cantidad_registros": resultado.cantidad_registros,
                "lineas": resultado.lineas[:300],
                "total_lineas": resultado.cantidad_registros,
                "errores": resultado.errores,
            }
        )


class PleDescargarView(PleBaseView):
    @extend_schema(
        parameters=[PleParametrosSerializer],
        responses={(200, "text/plain"): OpenApiTypes.BINARY},
    )
    def get(self, request):
        datos, almacen = self._parametros(request)
        resultado = PleService.generar(
            request.empresa,
            datos["libro"],
            datos["anio"],
            datos["mes"],
            almacen,
        )
        if resultado.errores:
            return Response(
                {
                    "detail": "El archivo no pasó la validación del PLE.",
                    "codigo": "ple_invalido",
                    "errores": resultado.errores,
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        ExportacionPLE.objects.create(
            empresa=request.empresa,
            libro=resultado.libro,
            anio=resultado.anio,
            mes=resultado.mes,
            nombre_archivo=resultado.nombre_archivo,
            hash_sha256=resultado.hash,
            cantidad_registros=resultado.cantidad_registros,
            generado_por=request.user,
        )
        encoding = getattr(settings, "PLE_ENCODING", "utf-8")
        response = HttpResponse(
            resultado.contenido.encode(encoding),
            content_type=f"text/plain; charset={encoding}",
        )
        response["Content-Disposition"] = f'attachment; filename="{resultado.nombre_archivo}"'
        response["X-Cantidad-Registros"] = str(resultado.cantidad_registros)
        return response


class PleValidarView(PleBaseView):
    serializer_class = PlePreviewSerializer

    @extend_schema(parameters=[PleParametrosSerializer], responses=PlePreviewSerializer)
    def get(self, request):
        return PlePreviewView().get(request)

    @extend_schema(parameters=[PleParametrosSerializer], responses=PlePreviewSerializer)
    def post(self, request):
        return PlePreviewView().get(request)


class PleHistorialView(PleBaseView):
    @extend_schema(responses=ExportacionPleSerializer(many=True))
    def get(self, request):
        qs = ExportacionPLE.objects.filter(empresa=request.empresa).select_related("generado_por")
        return Response(ExportacionPleSerializer(qs, many=True).data)
