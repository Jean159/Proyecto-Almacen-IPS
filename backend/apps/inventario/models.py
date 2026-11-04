from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from apps.almacenes.models import Almacen, Ubicacion
from apps.catalogo.models import LoteSerie, Producto
from apps.common.models import BaseModel
from apps.core.models import Empresa


class StockSaldo(BaseModel):
    almacen = models.ForeignKey(Almacen, on_delete=models.PROTECT, related_name="saldos")
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name="saldos")
    ubicacion = models.ForeignKey(Ubicacion, on_delete=models.SET_NULL, null=True, blank=True)
    lote_serie = models.ForeignKey(LoteSerie, on_delete=models.SET_NULL, null=True, blank=True)
    cantidad_fisica = models.DecimalField(max_digits=18, decimal_places=4, default=Decimal("0"))
    cantidad_reservada = models.DecimalField(max_digits=18, decimal_places=4, default=Decimal("0"))
    ultima_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inventario_stock_saldo"
        verbose_name = "Saldo de stock"
        verbose_name_plural = "Saldos de stock"
        constraints = [
            models.UniqueConstraint(
                fields=["almacen", "producto", "ubicacion", "lote_serie"],
                name="uniq_stock_almacen_producto_ubicacion_lote",
                nulls_distinct=False,
            ),
            models.CheckConstraint(
                condition=models.Q(cantidad_fisica__gte=0),
                name="chk_stock_fisica_no_negativa",
            ),
            models.CheckConstraint(
                condition=models.Q(cantidad_reservada__gte=0),
                name="chk_stock_reservada_no_negativa",
            ),
            models.CheckConstraint(
                condition=models.Q(cantidad_reservada__lte=models.F("cantidad_fisica")),
                name="chk_stock_reservada_menor_igual_fisica",
            ),
        ]
        indexes = [
            models.Index(fields=["almacen", "producto"]),
            models.Index(fields=["producto", "lote_serie"]),
        ]

    @property
    def cantidad_disponible(self):
        return self.cantidad_fisica - self.cantidad_reservada

    def clean(self):
        super().clean()
        if self.ubicacion and self.ubicacion.almacen_id != self.almacen_id:
            raise ValidationError("La ubicación pertenece a otro almacén.")
        if self.lote_serie and self.lote_serie.producto_id != self.producto_id:
            raise ValidationError("El lote pertenece a otro producto.")

    def __str__(self):
        return f"{self.almacen.codigo} / {self.producto.sku}: {self.cantidad_fisica}"


class ReservaStock(BaseModel):
    class Estado(models.TextChoices):
        ACTIVA = "ACTIVA", "Activa"
        LIBERADA = "LIBERADA", "Liberada"
        CONSUMIDA = "CONSUMIDA", "Consumida"
        VENCIDA = "VENCIDA", "Vencida"

    empresa = models.ForeignKey(Empresa, on_delete=models.PROTECT, related_name="reservas_stock")
    almacen = models.ForeignKey(Almacen, on_delete=models.PROTECT, related_name="reservas")
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name="reservas")
    ubicacion = models.ForeignKey(Ubicacion, on_delete=models.SET_NULL, null=True, blank=True)
    lote_serie = models.ForeignKey(LoteSerie, on_delete=models.SET_NULL, null=True, blank=True)
    cantidad = models.DecimalField(max_digits=18, decimal_places=4)
    estado = models.CharField(max_length=10, choices=Estado.choices, default=Estado.ACTIVA)
    expira_en = models.DateTimeField(null=True, blank=True)
    referencia = models.CharField(max_length=100, blank=True)
    creado_por = models.ForeignKey("core.Usuario", on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = "inventario_reserva"
        verbose_name = "Reserva de stock"
        verbose_name_plural = "Reservas de stock"
        ordering = ["-creado_en"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(cantidad__gt=0), name="chk_reserva_cantidad_positiva"
            )
        ]
        indexes = [models.Index(fields=["empresa", "producto", "estado"])]

    def clean(self):
        super().clean()
        if self.ubicacion and self.ubicacion.almacen_id != self.almacen_id:
            raise ValidationError("La ubicación pertenece a otro almacén.")
        if self.lote_serie and self.lote_serie.producto_id != self.producto_id:
            raise ValidationError("El lote pertenece a otro producto.")

    def __str__(self):
        return f"Reserva {self.producto.sku} x {self.cantidad}"


class SaldoPeriodo(BaseModel):
    empresa = models.ForeignKey(Empresa, on_delete=models.PROTECT, related_name="saldos_periodo")
    almacen = models.ForeignKey(Almacen, on_delete=models.PROTECT, related_name="saldos_periodo")
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name="saldos_periodo")
    periodo = models.CharField(max_length=6, db_index=True)
    cantidad = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    costo_total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    costo_unitario = models.DecimalField(max_digits=18, decimal_places=8, default=0)
    generado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inventario_saldo_periodo"
        verbose_name = "Saldo por periodo"
        verbose_name_plural = "Saldos por periodo"
        constraints = [
            models.UniqueConstraint(
                fields=["empresa", "almacen", "producto", "periodo"],
                name="uniq_saldo_periodo",
            ),
            models.CheckConstraint(
                condition=models.Q(cantidad__gte=0),
                name="chk_saldo_periodo_cantidad_no_negativa",
            ),
        ]
        indexes = [models.Index(fields=["empresa", "periodo"])]

    def __str__(self):
        return f"{self.periodo} {self.almacen.codigo} {self.producto.sku}"
