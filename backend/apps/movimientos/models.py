from django.db import models

from apps.almacenes.models import Almacen, Ubicacion
from apps.catalogo.models import LoteSerie, Producto
from apps.common.models import BaseModel
from apps.core.models import Empresa
from apps.core.sunat import TIPOS_COMPROBANTE, TIPOS_OPERACION


class MovimientoInventario(BaseModel):
    class Tipo(models.TextChoices):
        ENTRADA = "ENTRADA", "Entrada de mercadería"
        SALIDA = "SALIDA", "Salida de mercadería"
        TRANSFERENCIA = "TRANSFERENCIA", "Transferencia entre almacenes"
        AJUSTE = "AJUSTE", "Ajuste de inventario"

    class Estado(models.TextChoices):
        BORRADOR = "BORRADOR", "Borrador"
        CONFIRMADO = "CONFIRMADO", "Confirmado"
        ANULADO = "ANULADO", "Anulado"

    class DireccionAjuste(models.TextChoices):
        ENTRADA = "ENTRADA", "Entrada"
        SALIDA = "SALIDA", "Salida"

    class EstadoSunat(models.TextChoices):
        ACTUAL = "1", "Periodo actual"
        OMITIDO = "8", "Omitido en periodo anterior"
        RECTIFICATORIA = "9", "Rectificatoria"

    empresa = models.ForeignKey(Empresa, on_delete=models.PROTECT, related_name="movimientos")
    correlativo_interno = models.CharField(max_length=20, db_index=True)
    tipo_movimiento = models.CharField(max_length=15, choices=Tipo.choices)
    direccion_ajuste = models.CharField(max_length=7, choices=DireccionAjuste.choices, blank=True)

    tipo_operacion_sunat = models.CharField(max_length=2, choices=TIPOS_OPERACION)
    tipo_comprobante_sunat = models.CharField(max_length=2, choices=TIPOS_COMPROBANTE, default="00")
    serie_comprobante = models.CharField(max_length=20, default="0")
    numero_comprobante = models.CharField(max_length=20, default="0")
    fecha_operacion = models.DateField()
    fecha_documento = models.DateField(null=True, blank=True)

    almacen = models.ForeignKey(Almacen, on_delete=models.PROTECT, related_name="movimientos")
    almacen_destino = models.ForeignKey(
        Almacen,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="movimientos_destino",
    )

    cuo_contable = models.CharField(max_length=40, blank=True)
    correlativo_asiento = models.CharField(max_length=10, default="M1")
    estado_sunat = models.CharField(
        max_length=1, choices=EstadoSunat.choices, default=EstadoSunat.ACTUAL
    )

    glosa = models.CharField(max_length=200, blank=True)
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.BORRADOR)
    idempotency_key = models.CharField(max_length=64, blank=True)
    external_id = models.CharField(max_length=100, blank=True)
    usuario_registro = models.ForeignKey(
        "core.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimientos_registrados",
    )
    confirmado_por = models.ForeignKey(
        "core.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimientos_confirmados",
    )
    confirmado_en = models.DateTimeField(null=True, blank=True)
    anulado_por = models.ForeignKey(
        "core.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimientos_anulados",
    )
    anulado_en = models.DateTimeField(null=True, blank=True)
    movimiento_reverso_de = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reversos",
    )

    class Meta:
        db_table = "movimiento_inventario"
        verbose_name = "Movimiento de inventario"
        verbose_name_plural = "Movimientos de inventario"
        ordering = ["-fecha_operacion", "-creado_en"]
        constraints = [
            models.UniqueConstraint(
                fields=["empresa", "correlativo_interno"],
                name="uniq_movimiento_correlativo",
            ),
            models.UniqueConstraint(
                fields=["empresa", "idempotency_key"],
                condition=~models.Q(idempotency_key=""),
                name="uniq_movimiento_idempotency",
            ),
            models.UniqueConstraint(
                fields=["empresa", "external_id"],
                condition=~models.Q(external_id=""),
                name="uniq_movimiento_external_id",
            ),
            models.CheckConstraint(
                condition=models.Q(tipo_movimiento="TRANSFERENCIA")
                & models.Q(almacen_destino__isnull=False)
                | ~models.Q(tipo_movimiento="TRANSFERENCIA")
                & models.Q(almacen_destino__isnull=True),
                name="chk_movimiento_destino_segun_tipo",
            ),
            models.CheckConstraint(
                condition=~models.Q(tipo_movimiento="TRANSFERENCIA")
                | ~models.Q(almacen=models.F("almacen_destino")),
                name="chk_movimiento_transferencia_almacenes_distintos",
            ),
            models.CheckConstraint(
                condition=models.Q(
                    tipo_movimiento="AJUSTE",
                    direccion_ajuste__in=["ENTRADA", "SALIDA"],
                )
                | ~models.Q(tipo_movimiento="AJUSTE") & models.Q(direccion_ajuste=""),
                name="chk_movimiento_direccion_ajuste",
            ),
        ]
        indexes = [
            models.Index(fields=["empresa", "fecha_operacion"]),
            models.Index(fields=["empresa", "tipo_movimiento", "estado"]),
            models.Index(fields=["empresa", "almacen", "fecha_operacion"]),
        ]

    def __str__(self):
        return f"{self.correlativo_interno} {self.get_tipo_movimiento_display()}"


class MovimientoDetalle(BaseModel):
    movimiento = models.ForeignKey(
        MovimientoInventario, on_delete=models.CASCADE, related_name="detalles"
    )
    producto = models.ForeignKey(
        Producto, on_delete=models.PROTECT, related_name="movimiento_detalles"
    )
    ubicacion = models.ForeignKey(
        Ubicacion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    ubicacion_destino = models.ForeignKey(
        Ubicacion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    lote_serie = models.ForeignKey(
        LoteSerie,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimiento_detalles",
    )
    cantidad = models.DecimalField(max_digits=18, decimal_places=4)
    costo_unitario = models.DecimalField(max_digits=18, decimal_places=8, default=0)
    costo_total = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    class Meta:
        db_table = "movimiento_detalle"
        verbose_name = "Detalle de movimiento"
        verbose_name_plural = "Detalles de movimiento"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(cantidad__gt=0), name="chk_detalle_cantidad_positiva"
            ),
            models.CheckConstraint(
                condition=models.Q(costo_unitario__gte=0),
                name="chk_detalle_costo_unitario_no_negativo",
            ),
            models.CheckConstraint(
                condition=models.Q(costo_total__gte=0),
                name="chk_detalle_costo_total_no_negativo",
            ),
        ]
        indexes = [models.Index(fields=["producto", "creado_en"])]

    def __str__(self):
        return f"{self.producto.sku} x {self.cantidad}"


class EventoMovimiento(BaseModel):
    movimiento = models.ForeignKey(
        MovimientoInventario, on_delete=models.CASCADE, related_name="eventos"
    )
    accion = models.CharField(max_length=30)
    usuario = models.ForeignKey("core.Usuario", on_delete=models.SET_NULL, null=True, blank=True)
    detalle = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "movimiento_evento"
        ordering = ["creado_en"]

    def __str__(self):
        return f"{self.movimiento.correlativo_interno} {self.accion}"
