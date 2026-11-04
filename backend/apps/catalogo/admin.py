from django.contrib import admin

from apps.catalogo.models import CategoriaProducto, LoteSerie, Producto


@admin.register(CategoriaProducto)
class CategoriaProductoAdmin(admin.ModelAdmin):
    list_display = ["nombre", "empresa", "parent", "activo"]
    list_filter = ["empresa", "activo"]
    search_fields = ["nombre", "empresa__razon_social"]


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = [
        "sku",
        "descripcion",
        "empresa",
        "tipo_existencia",
        "unidad_medida",
        "metodo_valuacion",
        "activo",
    ]
    list_filter = [
        "empresa",
        "activo",
        "tipo_existencia",
        "metodo_valuacion",
        "control_lotes",
        "control_series",
    ]
    search_fields = ["sku", "codigo_barras", "descripcion", "codigo_propio_sunat"]


@admin.register(LoteSerie)
class LoteSerieAdmin(admin.ModelAdmin):
    list_display = ["numero_lote_serie", "producto", "fecha_vencimiento", "estado"]
    list_filter = ["estado", "activo", "producto__empresa"]
    search_fields = ["numero_lote_serie", "producto__sku", "producto__descripcion"]
    date_hierarchy = "fecha_vencimiento"
