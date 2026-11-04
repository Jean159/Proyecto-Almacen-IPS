from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health(_request):
    return JsonResponse({"status": "ok", "servicio": "erp-almacen"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health, name="health"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/", include("apps.almacenes.urls")),
    path("api/v1/", include("apps.catalogo.urls")),
    path("api/v1/", include("apps.inventario.urls")),
    path("api/v1/", include("apps.movimientos.urls")),
    path("api/v1/", include("apps.kardex.urls")),
    path("api/v1/", include("apps.sunat_ple.urls")),
    path("api/v1/", include("apps.integraciones.urls")),
]
