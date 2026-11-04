from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.integraciones.serializers import IntegracionEstadoSerializer


class IntegracionEstadoView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=IntegracionEstadoSerializer)
    def get(self, request):
        return Response(
            {
                "servicio": "integraciones",
                "estado": "disponible",
                "descripcion": "Contrato para ventas, compras y distribución.",
            }
        )
