from django.contrib import admin

from apps.kardex.models import CapaCosto, ConsumoCapa, KardexValorizado, SaldoKardex


@admin.register(SaldoKardex)
class SaldoKardexAdmin(admin.ModelAdmin):
    list_display = [
        "empresa",
        "almacen",
        "producto",
        "cantidad",
        "costo_unitario",
        "costo_total",
        "ultima_secuencia",
    ]
    list_filter = ["empresa", "almacen"]
    search_fields = ["producto__sku", "producto__descripcion"]


@admin.register(KardexValorizado)
class KardexValorizadoAdmin(admin.ModelAdmin):
    list_display = [
        "fecha_operacion",
        "almacen",
        "producto",
        "lado",
        "cantidad_entrada",
        "cantidad_salida",
        "cantidad_saldo",
        "costo_total_saldo",
    ]
    list_filter = ["empresa", "almacen", "lado", "periodo_aaaamm"]
    search_fields = ["producto__sku", "producto__descripcion", "cuo_contable"]
    date_hierarchy = "fecha_operacion"
    readonly_fields = [f.name for f in KardexValorizado._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(CapaCosto)
class CapaCostoAdmin(admin.ModelAdmin):
    list_display = [
        "producto",
        "almacen",
        "fecha_operacion",
        "cantidad_inicial",
        "cantidad_disponible",
        "costo_unitario",
    ]
    list_filter = ["empresa", "almacen"]
    search_fields = ["producto__sku"]


@admin.register(ConsumoCapa)
class ConsumoCapaAdmin(admin.ModelAdmin):
    list_display = ["capa", "kardex", "cantidad", "costo_total"]
    list_filter = ["capa__empresa"]
    search_fields = ["capa__producto__sku"]
