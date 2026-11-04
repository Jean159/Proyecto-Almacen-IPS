import re

from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models import BaseModel
from apps.core.models import Empresa
from apps.core.validators import validar_ubigeo


class Almacen(BaseModel):
    empresa = models.ForeignKey(Empresa, on_delete=models.PROTECT, related_name="almacenes")
    codigo = models.CharField(max_length=20, help_text="Código interno del almacén.")
    codigo_establecimiento = models.CharField(
        max_length=4,
        default="0000",
        help_text="Código de establecimiento anexo SUNAT (4 dígitos).",
    )
    codigo_correlativo = models.CharField(
        max_length=3,
        null=True,
        blank=True,
        help_text="Correlativo opcional de 3 dígitos para diferenciar almacenes del mismo anexo.",
    )
    nombre = models.CharField(max_length=100)
    direccion = models.CharField(max_length=250)
    ubigeo = models.CharField(max_length=6, blank=True, validators=[validar_ubigeo])
    es_almacen_tercero = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "almacen_almacen"
        verbose_name = "Almacén"
        verbose_name_plural = "Almacenes"
        ordering = ["nombre"]
        constraints = [
            models.UniqueConstraint(
                fields=["empresa", "codigo"], name="uniq_almacen_empresa_codigo"
            ),
            models.UniqueConstraint(
                fields=["empresa", "codigo_establecimiento", "codigo_correlativo"],
                name="uniq_almacen_empresa_establecimiento_correlativo",
                nulls_distinct=False,
            ),
        ]

    def clean(self):
        super().clean()
        if not re.fullmatch(r"\d{4}", self.codigo_establecimiento or ""):
            raise ValidationError({"codigo_establecimiento": "Debe tener exactamente 4 dígitos."})
        if self.codigo_correlativo and not re.fullmatch(r"\d{3}", self.codigo_correlativo):
            raise ValidationError({"codigo_correlativo": "Debe tener exactamente 3 dígitos."})
        if self.es_almacen_tercero:
            self.codigo_establecimiento = "9999"

    def save(self, *args, **kwargs):
        if not self.codigo_correlativo:
            self.codigo_correlativo = None
        super().save(*args, **kwargs)

    @property
    def codigo_sunat(self) -> str:
        return f"{self.codigo_establecimiento}{self.codigo_correlativo or ''}"

    def __str__(self):
        return f"[{self.codigo_sunat}] {self.nombre}"


class Ubicacion(BaseModel):
    almacen = models.ForeignKey(Almacen, on_delete=models.CASCADE, related_name="ubicaciones")
    codigo = models.CharField(max_length=30, help_text="Ej: PAS-01-RACK-02-NIV-03")
    descripcion = models.CharField(max_length=100, blank=True)
    capacidad_peso_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    capacidad_volumen_m3 = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "almacen_ubicacion"
        verbose_name = "Ubicación"
        verbose_name_plural = "Ubicaciones"
        ordering = ["almacen", "codigo"]
        constraints = [
            models.UniqueConstraint(
                fields=["almacen", "codigo"], name="uniq_ubicacion_almacen_codigo"
            ),
            models.CheckConstraint(
                condition=models.Q(capacidad_peso_kg__isnull=True)
                | models.Q(capacidad_peso_kg__gte=0),
                name="chk_ubicacion_peso_no_negativo",
            ),
            models.CheckConstraint(
                condition=models.Q(capacidad_volumen_m3__isnull=True)
                | models.Q(capacidad_volumen_m3__gte=0),
                name="chk_ubicacion_volumen_no_negativo",
            ),
        ]

    def __str__(self):
        return f"{self.almacen.nombre} / {self.codigo}"
