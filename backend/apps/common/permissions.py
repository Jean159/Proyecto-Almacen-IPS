from rest_framework.permissions import BasePermission

from apps.core.tenancy import obtener_empresa, obtener_rol

ROLES_LECTURA = {"ADMIN", "JEFE", "OPERADOR", "CONSULTA", "AUDITOR"}
ROLES_ESCRITURA = {"ADMIN", "JEFE", "OPERADOR"}
ROLES_CONFIRMAR = {"ADMIN", "JEFE", "OPERADOR"}
ROLES_ANULAR = {"ADMIN", "JEFE"}
ROLES_PLE = {"ADMIN", "JEFE", "AUDITOR"}


class EsMiembroEmpresa(BasePermission):
    message = "Debe pertenecer a una empresa activa."

    def has_permission(self, request, view):
        obtener_empresa(request)
        return True


class PuedeLeer(BasePermission):
    def has_permission(self, request, view):
        obtener_empresa(request)
        return request.user.is_superuser or obtener_rol(request) in ROLES_LECTURA


class PuedeEscribir(BasePermission):
    def has_permission(self, request, view):
        obtener_empresa(request)
        return request.user.is_superuser or obtener_rol(request) in ROLES_ESCRITURA


class PuedeConfirmar(BasePermission):
    def has_permission(self, request, view):
        obtener_empresa(request)
        return request.user.is_superuser or obtener_rol(request) in ROLES_CONFIRMAR


class PuedeAnular(BasePermission):
    def has_permission(self, request, view):
        obtener_empresa(request)
        return request.user.is_superuser or obtener_rol(request) in ROLES_ANULAR


class PuedePle(BasePermission):
    def has_permission(self, request, view):
        obtener_empresa(request)
        return request.user.is_superuser or obtener_rol(request) in ROLES_PLE
