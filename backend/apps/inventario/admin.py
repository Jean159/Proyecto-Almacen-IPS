from django.contrib import admin

from apps.inventario.models import ReservaStock, SaldoPeriodo, StockSaldo


@admin.register(StockSaldo)
class StockSaldoAdmin(admin.ModelAdmin):
    list_display = [
        "almacen",
        "producto",
        "ubicacion",
        "lote_serie",
        "cantidad_fisica",
        "cantidad_reservada",
    ]
    list_filter = ["almacen__empresa", "almacen"]
    search_fields = ["producto__sku", "producto__descripcion", "almacen__nombre"]
    readonly_fields = ["ultima_actualizacion"]


@admin.register(ReservaStock)
class ReservaStockAdmin(admin.ModelAdmin):
    list_display = ["producto", "almacen", "cantidad", "estado", "expira_en"]
    list_filter = ["empresa", "estado", "almacen"]
    search_fields = ["producto__sku", "referencia"]


@admin.register(SaldoPeriodo)
class SaldoPeriodoAdmin(admin.ModelAdmin):
    list_display = ["periodo", "almacen", "producto", "cantidad", "costo_total"]
    list_filter = ["empresa", "periodo", "almacen"]
    search_fields = ["producto__sku", "producto__descripcion"]
