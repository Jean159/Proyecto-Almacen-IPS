from django.contrib import admin

from apps.sunat_ple.models import ExportacionPLE


@admin.register(ExportacionPLE)
class ExportacionPLEAdmin(admin.ModelAdmin):
    list_display = [
        "libro",
        "anio",
        "mes",
        "nombre_archivo",
        "cantidad_registros",
        "generado_por",
        "creado_en",
    ]
    list_filter = ["libro", "anio", "mes", "empresa"]
    search_fields = ["nombre_archivo", "hash_sha256"]
    readonly_fields = [
        "empresa",
        "libro",
        "anio",
        "mes",
        "nombre_archivo",
        "hash_sha256",
        "cantidad_registros",
        "errores",
        "generado_por",
    ]
