from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.catalogo.views import (
    CategoriaProductoViewSet,
    LoteSerieViewSet,
    ProductoViewSet,
)

router = DefaultRouter()
router.register("categorias", CategoriaProductoViewSet, basename="categoria")
router.register("productos", ProductoViewSet, basename="producto")
router.register("lotes", LoteSerieViewSet, basename="lote")

urlpatterns = [path("", include(router.urls))]
