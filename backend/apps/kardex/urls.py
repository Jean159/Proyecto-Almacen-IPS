from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.kardex.views import KardexViewSet, SaldoKardexViewSet

router = DefaultRouter()
router.register("kardex", KardexViewSet, basename="kardex")
router.register("saldos-kardex", SaldoKardexViewSet, basename="saldo-kardex")

urlpatterns = [path("", include(router.urls))]
