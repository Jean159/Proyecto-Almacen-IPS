from rest_framework.views import APIView

from apps.core.tenancy import obtener_empresa


class EmpresaScopedViewSetMixin:
    """Resuelve la empresa del header X-Empresa-ID y filtra el queryset."""

    empresa_lookup = "empresa"

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        obtener_empresa(request)

    def get_empresa(self):
        return self.request.empresa

    def filtrar_empresa(self, queryset):
        empresa = getattr(self.request, "empresa", None)
        if empresa is None:
            return queryset.none()
        if self.empresa_lookup:
            return queryset.filter(**{self.empresa_lookup: empresa})
        return queryset


class EmpresaScopedAPIView(APIView):
    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        obtener_empresa(request)

    def get_empresa(self):
        return self.request.empresa
