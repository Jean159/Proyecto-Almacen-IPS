from django.contrib import admin

from apps.movimientos.models import (
    EventoMovimiento,
    MovimientoDetalle,
    MovimientoInventario,
)


class DetalleInline(admin.TabularInline):
    model = MovimientoDetalle
    extra = 0
    readonly_fields = ["costo_unitario", "costo_total"]


@admin.register(MovimientoInventario)
class MovimientoAdmin(admin.ModelAdmin):
    list_display = [
        "correlativo_interno",
        "tipo_movimiento",
        "fecha_operacion",
        "almacen",
        "estado",
        "glosa",
    ]
    list_filter = ["empresa", "tipo_movimiento", "estado", "fecha_operacion"]
    search_fields = ["correlativo_interno", "glosa", "cuo_contable", "external_id"]
    inlines = [DetalleInline]
    readonly_fields = [
        "empresa",
        "correlativo_interno",
        "estado",
        "cuo_contable",
        "confirmado_por",
        "confirmado_en",
        "anulado_por",
        "anulado_en",
    ]


@admin.register(EventoMovimiento)
class EventoMovimientoAdmin(admin.ModelAdmin):
    list_display = ["movimiento", "accion", "usuario", "creado_en"]
    list_filter = ["accion"]
    search_fields = ["movimiento__correlativo_interno", "usuario__email"]
