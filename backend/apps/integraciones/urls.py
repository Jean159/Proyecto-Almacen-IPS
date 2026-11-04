from django.urls import path

from apps.integraciones.views import IntegracionEstadoView

urlpatterns = [
    path("integraciones/estado/", IntegracionEstadoView.as_view(), name="integracion-estado"),
]
