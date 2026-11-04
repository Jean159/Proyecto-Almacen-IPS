from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.core.models import (
    CierrePeriodo,
    Empresa,
    EventoAuditoria,
    Secuencia,
    SunatTabla,
    Usuario,
    UsuarioEmpresa,
)


@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin):
    ordering = ["email"]
    list_display = ["email", "first_name", "last_name", "is_staff", "is_active"]
    search_fields = ["email", "first_name", "last_name"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Datos personales", {"fields": ("first_name", "last_name", "telefono")}),
        (
            "Permisos",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Fechas", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "is_staff", "is_active"),
            },
        ),
    )


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ["ruc", "razon_social", "moneda_principal", "es_oficial", "activo"]
    search_fields = ["ruc", "razon_social", "nombre_comercial"]
    list_filter = ["activo", "es_oficial", "moneda_principal"]


@admin.register(UsuarioEmpresa)
class UsuarioEmpresaAdmin(admin.ModelAdmin):
    list_display = ["usuario", "empresa", "rol", "activo"]
    list_filter = ["rol", "activo", "empresa"]
    search_fields = ["usuario__email", "empresa__razon_social", "empresa__ruc"]


@admin.register(SunatTabla)
class SunatTablaAdmin(admin.ModelAdmin):
    list_display = ["tabla_numero", "codigo", "descripcion", "activo"]
    list_filter = ["tabla_numero", "activo"]
    search_fields = ["codigo", "descripcion"]


@admin.register(Secuencia)
class SecuenciaAdmin(admin.ModelAdmin):
    list_display = ["empresa", "tipo", "anio", "ultimo"]
    list_filter = ["tipo", "anio", "empresa"]


@admin.register(CierrePeriodo)
class CierrePeriodoAdmin(admin.ModelAdmin):
    list_display = ["empresa", "anio", "mes", "estado", "cerrado_por", "cerrado_en"]
    list_filter = ["estado", "anio", "empresa"]


@admin.register(EventoAuditoria)
class EventoAuditoriaAdmin(admin.ModelAdmin):
    list_display = ["empresa", "entidad", "entidad_id", "accion", "usuario", "creado_en"]
    list_filter = ["accion", "entidad", "empresa"]
    search_fields = ["entidad_id", "usuario__email"]
    readonly_fields = ["empresa", "usuario", "entidad", "entidad_id", "accion", "datos"]
