from django.urls import path

from apps.sunat_ple.views import (
    PleDescargarView,
    PleHistorialView,
    PlePreviewView,
    PleValidarView,
)

urlpatterns = [
    path("ple/preview/", PlePreviewView.as_view(), name="ple-preview"),
    path("ple/descargar/", PleDescargarView.as_view(), name="ple-descargar"),
    path("ple/validar/", PleValidarView.as_view(), name="ple-validar"),
    path("ple/historial/", PleHistorialView.as_view(), name="ple-historial"),
]
