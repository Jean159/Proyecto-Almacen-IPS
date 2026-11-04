from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models import BaseModel
from apps.core.models import Empresa
from apps.core.sunat import (
    CATALOGOS_EXISTENCIA,
    TIPOS_EXISTENCIA,
    UNIDADES_MEDIDA,
)


class CategoriaProducto(BaseModel):
    empresa = models.ForeignKey(Empresa, on_delete=models.PROTECT, related_name="categorias")
    nombre = models.CharField(max_length=100)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subcategorias",
    )
    cuenta_contable_inventario = models.CharField(
        max_length=24, default="20111", help_text="Subcuenta PCGE."
    )
    cuenta_contable_costo_venta = models.CharField(
        max_length=24, default="69111", help_text="Subcuenta PCGE."
    )
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "catalogo_categoria"
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"
        ordering = ["nombre"]
        constraints = [
            models.UniqueConstraint(
                fields=["empresa", "nombre", "parent"],
                name="uniq_categoria_empresa_nombre_parent",
                nulls_distinct=False,
            )
        ]

    def clean(self):
        super().clean()
        if self.parent and self.parent.empresa_id != self.empresa_id:
            raise ValidationError("La categoría padre pertenece a otra empresa.")
        if self.parent_id and self.parent_id == self.pk:
            raise ValidationError("Una categoría no puede ser su propio padre.")

    def __str__(self):
        return self.nombre


class Producto(BaseModel):
    class MetodoValuacion(models.TextChoices):
        PROMEDIO = "1", "Promedio ponderado"
        FIFO = "2", "Primeras entradas, primeras salidas (PEPS/FIFO)"
        IDENTIFICACION = "5", "Identificación específica"

    empresa = models.ForeignKey(Empresa, on_delete=models.PROTECT, related_name="productos")
    categoria = models.ForeignKey(
        CategoriaProducto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="productos",
    )
    sku = models.CharField(max_length=50, db_index=True)
    codigo_barras = models.CharField(max_length=50, blank=True, db_index=True)
    descripcion = models.CharField(max_length=250)

    tipo_existencia = models.CharField(max_length=2, choices=TIPOS_EXISTENCIA, default="01")
    unidad_medida = models.CharField(max_length=3, choices=UNIDADES_MEDIDA, default="NIU")
    catalogo_tipo = models.CharField(max_length=1, choices=CATALOGOS_EXISTENCIA, default="9")
    codigo_propio_sunat = models.CharField(max_length=24)
    catalogo_internacional = models.CharField(
        max_length=1,
        blank=True,
        choices=[("1", "Naciones Unidas (UNSPSC)"), ("3", "GS1 (GTIN)")],
        help_text="Campo 8 del PLE. No admite 9; solo si el comprobante usa UNSPSC/GTIN.",
    )
    codigo_internacional = models.CharField(
        max_length=128,
        blank=True,
        help_text="Campo 9 del PLE: código UNSPSC o GTIN.",
    )
    cubso_osce = models.CharField(
        max_length=16,
        blank=True,
        default="0000000000000000",
        help_text="Código comercial OSCE; no forma parte del PLE 12.1/13.1.",
    )
    metodo_valuacion = models.CharField(
        max_length=1, choices=MetodoValuacion.choices, default=MetodoValuacion.PROMEDIO
    )

    control_lotes = models.BooleanField(default=False)
    control_series = models.BooleanField(default=False)
    stock_minimo = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    stock_maximo = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    punto_reorden = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    atributos_extra = models.JSONField(default=dict, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "catalogo_producto"
        verbose_name = "Producto"
        verbose_name_plural = "Productos"
        ordering = ["descripcion"]
        constraints = [
            models.UniqueConstraint(fields=["empresa", "sku"], name="uniq_producto_empresa_sku"),
            models.UniqueConstraint(
                fields=["empresa", "codigo_propio_sunat"],
                name="uniq_producto_empresa_codigo_sunat",
            ),
            models.UniqueConstraint(
                fields=["empresa", "codigo_barras"],
                condition=~models.Q(codigo_barras=""),
                name="uniq_producto_empresa_codigo_barras",
            ),
            models.CheckConstraint(
                condition=models.Q(stock_minimo__gte=0)
                & models.Q(stock_maximo__gte=0)
                & models.Q(punto_reorden__gte=0),
                name="chk_producto_stock_no_negativo",
            ),
        ]

    def clean(self):
        super().clean()
        if self.categoria and self.categoria.empresa_id != self.empresa_id:
            raise ValidationError("La categoría pertenece a otra empresa.")
        if self.control_lotes and self.control_series:
            raise ValidationError("Un producto no puede controlar lotes y series al mismo tiempo.")
        if self.catalogo_internacional == "9":
            raise ValidationError("El catálogo internacional no admite el código 9 (propio).")
        if bool(self.catalogo_internacional) != bool(self.codigo_internacional):
            raise ValidationError("Debe registrar catálogo y código internacional juntos.")
        if self.metodo_valuacion == self.MetodoValuacion.IDENTIFICACION:
            # El catálogo lo permite, pero el motor v1 solo implementa PP y FIFO.
            pass

    def __str__(self):
        return f"[{self.sku}] {self.descripcion}"


class LoteSerie(BaseModel):
    class Estado(models.TextChoices):
        DISPONIBLE = "DISPONIBLE", "Disponible"
        CUARENTENA = "CUARENTENA", "En cuarentena"
        VENCIDO = "VENCIDO", "Vencido"

    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name="lotes_series")
    numero_lote_serie = models.CharField(max_length=50, db_index=True)
    fecha_fabricacion = models.DateField(null=True, blank=True)
    fecha_vencimiento = models.DateField(null=True, blank=True, db_index=True)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.DISPONIBLE)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "catalogo_lote_serie"
        verbose_name = "Lote o serie"
        verbose_name_plural = "Lotes y series"
        ordering = ["fecha_vencimiento", "numero_lote_serie"]
        constraints = [
            models.UniqueConstraint(
                fields=["producto", "numero_lote_serie"],
                name="uniq_lote_producto_numero",
            )
        ]

    def clean(self):
        super().clean()
        if (
            self.fecha_fabricacion
            and self.fecha_vencimiento
            and self.fecha_vencimiento < self.fecha_fabricacion
        ):
            raise ValidationError("La fecha de vencimiento no puede ser anterior a la fabricación.")

    def __str__(self):
        return f"{self.producto.sku} / {self.numero_lote_serie}"
