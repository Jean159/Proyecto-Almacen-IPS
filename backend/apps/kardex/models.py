from django.db import models

from apps.almacenes.models import Almacen
from apps.catalogo.models import LoteSerie, Producto
from apps.common.models import AppendOnlyModel, BaseModel
from apps.core.models import Empresa
from apps.core.sunat import (
    CATALOGOS_EXISTENCIA,
    METODOS_VALUACION,
    TIPOS_COMPROBANTE,
    TIPOS_EXISTENCIA,
    TIPOS_OPERACION,
    UNIDADES_MEDIDA,
)
from apps.movimientos.models import MovimientoDetalle


class SaldoKardex(BaseModel):
    """Cabecera de saldo por producto y almacén; se bloquea para serializar."""

    empresa = models.ForeignKey(Empresa, on_delete=models.PROTECT, related_name="saldos_kardex")
    almacen = models.ForeignKey(Almacen, on_delete=models.PROTECT, related_name="saldos_kardex")
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name="saldos_kardex")
    cantidad = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    costo_total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    costo_unitario = models.DecimalField(max_digits=18, decimal_places=8, default=0)
    ultima_secuencia = models.BigIntegerField(default=0)

    class Meta:
        db_table = "kardex_saldo"
        verbose_name = "Saldo de kardex"
        verbose_name_plural = "Saldos de kardex"
        constraints = [
            models.UniqueConstraint(
                fields=["empresa", "almacen", "producto"],
                name="uniq_saldo_kardex",
            ),
            models.CheckConstraint(
                condition=models.Q(cantidad__gte=0),
                name="chk_saldo_kardex_cantidad_no_negativa",
            ),
            models.CheckConstraint(
                condition=models.Q(costo_total__gte=0),
                name="chk_saldo_kardex_costo_no_negativo",
            ),
        ]
        indexes = [models.Index(fields=["empresa", "almacen", "producto"])]

    def __str__(self):
        return f"{self.almacen.codigo} / {self.producto.sku}: {self.cantidad}"


class KardexValorizado(AppendOnlyModel):
    class Lado(models.TextChoices):
        ENTRADA = "ENTRADA", "Entrada"
        SALIDA = "SALIDA", "Salida"

    empresa = models.ForeignKey(Empresa, on_delete=models.PROTECT, related_name="kardex")
    almacen = models.ForeignKey(Almacen, on_delete=models.PROTECT, related_name="kardex")
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name="kardex")
    movimiento_detalle = models.ForeignKey(
        MovimientoDetalle, on_delete=models.PROTECT, related_name="kardex_registros"
    )
    lado = models.CharField(max_length=7, choices=Lado.choices)
    secuencia = models.BigIntegerField()

    periodo_aaaamm = models.CharField(max_length=6, db_index=True)
    fecha_operacion = models.DateField(db_index=True)
    tipo_operacion = models.CharField(max_length=2, choices=TIPOS_OPERACION)

    # Snapshot de los datos que exige el PLE; no dependen del maestro actual.
    establecimiento_anexo = models.CharField(max_length=7)
    catalogo_tipo = models.CharField(max_length=1, choices=CATALOGOS_EXISTENCIA)
    tipo_existencia = models.CharField(max_length=2, choices=TIPOS_EXISTENCIA)
    codigo_propio_sunat = models.CharField(max_length=24)
    catalogo_internacional = models.CharField(
        max_length=1,
        blank=True,
        choices=[("1", "Naciones Unidas (UNSPSC)"), ("3", "GS1 (GTIN)")],
    )
    codigo_internacional = models.CharField(max_length=128, blank=True)
    descripcion_producto = models.CharField(max_length=80)
    unidad_medida = models.CharField(max_length=3, choices=UNIDADES_MEDIDA)
    metodo_valuacion = models.CharField(max_length=1, choices=METODOS_VALUACION)

    fecha_documento = models.DateField(null=True, blank=True)
    tipo_comprobante = models.CharField(max_length=2, choices=TIPOS_COMPROBANTE)
    serie_comprobante = models.CharField(max_length=20)
    numero_comprobante = models.CharField(max_length=20)
    cuo_contable = models.CharField(max_length=40)
    correlativo_asiento = models.CharField(max_length=10)
    estado_sunat = models.CharField(max_length=1, default="1")
    glosa = models.CharField(max_length=200, blank=True)

    cantidad_entrada = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    costo_unitario_entrada = models.DecimalField(max_digits=18, decimal_places=8, default=0)
    costo_total_entrada = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    cantidad_salida = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    costo_unitario_salida = models.DecimalField(max_digits=18, decimal_places=8, default=0)
    costo_total_salida = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    cantidad_saldo = models.DecimalField(max_digits=18, decimal_places=4)
    costo_unitario_saldo = models.DecimalField(max_digits=18, decimal_places=8)
    costo_total_saldo = models.DecimalField(max_digits=18, decimal_places=2)

    class Meta:
        db_table = "kardex_valorizado"
        verbose_name = "Kardex valorizado"
        verbose_name_plural = "Kardex valorizado"
        ordering = ["fecha_operacion", "secuencia"]
        constraints = [
            models.UniqueConstraint(
                fields=["movimiento_detalle", "lado"],
                name="uniq_kardex_detalle_lado",
            ),
            models.UniqueConstraint(
                fields=["empresa", "almacen", "producto", "secuencia"],
                name="uniq_kardex_secuencia",
            ),
            models.CheckConstraint(
                condition=models.Q(cantidad_entrada__gte=0),
                name="chk_kardex_entrada_no_negativa",
            ),
            models.CheckConstraint(
                condition=models.Q(cantidad_salida__gte=0),
                name="chk_kardex_salida_no_negativa",
            ),
            models.CheckConstraint(
                condition=models.Q(cantidad_entrada=0) | models.Q(cantidad_salida=0),
                name="chk_kardex_un_solo_lado",
            ),
            models.CheckConstraint(
                condition=models.Q(cantidad_saldo__gte=0),
                name="chk_kardex_saldo_no_negativo",
            ),
            models.CheckConstraint(
                condition=models.Q(costo_total_entrada__gte=0)
                & models.Q(costo_total_salida__gte=0)
                & models.Q(costo_total_saldo__gte=0),
                name="chk_kardex_costos_no_negativos",
            ),
        ]
        indexes = [
            models.Index(fields=["empresa", "almacen", "producto", "periodo_aaaamm"]),
            models.Index(fields=["empresa", "periodo_aaaamm"]),
            models.Index(fields=["empresa", "fecha_operacion"]),
        ]

    def __str__(self):
        return (
            f"{self.fecha_operacion} {self.producto.sku} "
            f"{self.get_lado_display()} {self.cantidad_entrada or self.cantidad_salida}"
        )


class CapaCosto(BaseModel):
    empresa = models.ForeignKey(Empresa, on_delete=models.PROTECT, related_name="capas_costo")
    almacen = models.ForeignKey(Almacen, on_delete=models.PROTECT, related_name="capas_costo")
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name="capas_costo")
    lote_serie = models.ForeignKey(
        LoteSerie,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="capas_costo",
    )
    movimiento_detalle = models.ForeignKey(
        MovimientoDetalle, on_delete=models.PROTECT, related_name="capas_costo"
    )
    fecha_operacion = models.DateField()
    costo_unitario = models.DecimalField(max_digits=18, decimal_places=8)
    cantidad_inicial = models.DecimalField(max_digits=18, decimal_places=4)
    cantidad_disponible = models.DecimalField(max_digits=18, decimal_places=4)
    secuencia = models.BigIntegerField()

    class Meta:
        db_table = "kardex_capa_costo"
        verbose_name = "Capa de costo FIFO"
        verbose_name_plural = "Capas de costo FIFO"
        ordering = ["fecha_operacion", "secuencia", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["empresa", "almacen", "producto", "secuencia"],
                name="uniq_capa_costo_secuencia",
            ),
            models.CheckConstraint(
                condition=models.Q(cantidad_inicial__gt=0),
                name="chk_capa_cantidad_inicial_positiva",
            ),
            models.CheckConstraint(
                condition=models.Q(cantidad_disponible__gte=0),
                name="chk_capa_disponible_no_negativa",
            ),
            models.CheckConstraint(
                condition=models.Q(cantidad_disponible__lte=models.F("cantidad_inicial")),
                name="chk_capa_disponible_menor_inicial",
            ),
        ]
        indexes = [models.Index(fields=["empresa", "almacen", "producto", "fecha_operacion"])]

    def __str__(self):
        return f"Capa {self.producto.sku} {self.cantidad_disponible} @ {self.costo_unitario}"


class ConsumoCapa(AppendOnlyModel):
    capa = models.ForeignKey(CapaCosto, on_delete=models.PROTECT, related_name="consumos")
    kardex = models.ForeignKey(
        KardexValorizado, on_delete=models.PROTECT, related_name="consumos_capa"
    )
    cantidad = models.DecimalField(max_digits=18, decimal_places=4)
    costo_unitario = models.DecimalField(max_digits=18, decimal_places=8)
    costo_total = models.DecimalField(max_digits=18, decimal_places=2)

    class Meta:
        db_table = "kardex_consumo_capa"
        verbose_name = "Consumo de capa"
        verbose_name_plural = "Consumos de capa"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(cantidad__gt=0), name="chk_consumo_cantidad_positiva"
            )
        ]

    def __str__(self):
        return f"{self.capa.producto.sku} x {self.cantidad}"
