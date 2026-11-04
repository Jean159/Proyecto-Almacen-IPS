from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.movimientos.views import MovimientoViewSet

router = DefaultRouter()
router.register("movimientos", MovimientoViewSet, basename="movimiento")

urlpatterns = [path("", include(router.urls))]
