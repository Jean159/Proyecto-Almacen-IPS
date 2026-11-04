from django.contrib import admin

from apps.almacenes.models import Almacen, Ubicacion


@admin.register(Almacen)
class AlmacenAdmin(admin.ModelAdmin):
    list_display = [
        "codigo_sunat",
        "codigo",
        "nombre",
        "empresa",
        "es_almacen_tercero",
        "activo",
    ]
    list_filter = ["empresa", "activo", "es_almacen_tercero"]
    search_fields = ["codigo", "nombre", "direccion", "empresa__razon_social"]


@admin.register(Ubicacion)
class UbicacionAdmin(admin.ModelAdmin):
    list_display = ["almacen", "codigo", "descripcion", "activo"]
    list_filter = ["almacen__empresa", "activo"]
    search_fields = ["codigo", "descripcion", "almacen__nombre"]
