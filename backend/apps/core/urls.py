from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.core.views import (
    CierrePeriodoViewSet,
    DashboardView,
    EmpresaViewSet,
    LoginView,
    MeView,
    SunatTablaViewSet,
)

router = DefaultRouter()
router.register("empresas", EmpresaViewSet, basename="empresa")
router.register("sunat/tablas", SunatTablaViewSet, basename="sunat-tabla")
router.register("cierres-periodo", CierrePeriodoViewSet, basename="cierre-periodo")

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("dashboard/kpis/", DashboardView.as_view(), name="dashboard-kpis"),
    path("", include(router.urls)),
]
