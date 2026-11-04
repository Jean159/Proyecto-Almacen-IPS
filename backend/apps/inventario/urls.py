from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.inventario.views import (
    ReservaStockViewSet,
    SaldoPeriodoViewSet,
    StockSaldoViewSet,
)

router = DefaultRouter()
router.register("stock", StockSaldoViewSet, basename="stock")
router.register("reservas", ReservaStockViewSet, basename="reserva")
router.register("saldos-periodo", SaldoPeriodoViewSet, basename="saldo-periodo")

urlpatterns = [path("", include(router.urls))]
