from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.almacenes.views import AlmacenViewSet, UbicacionViewSet

router = DefaultRouter()
router.register("almacenes", AlmacenViewSet, basename="almacen")
router.register("ubicaciones", UbicacionViewSet, basename="ubicacion")

urlpatterns = [path("", include(router.urls))]
