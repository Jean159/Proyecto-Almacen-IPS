from django.db import models

from apps.common.models import BaseModel
from apps.core.models import Empresa


class ExportacionPLE(BaseModel):
    class Libro(models.TextChoices):
        INVENTARIO_FISICO = "12.1", "Inventario permanente en unidades físicas"
        INVENTARIO_VALORIZADO = "13.1", "Inventario permanente valorizado"

    empresa = models.ForeignKey(Empresa, on_delete=models.PROTECT, related_name="exportaciones_ple")
    libro = models.CharField(max_length=4, choices=Libro.choices)
    anio = models.PositiveSmallIntegerField()
    mes = models.PositiveSmallIntegerField()
    nombre_archivo = models.CharField(max_length=80)
    hash_sha256 = models.CharField(max_length=64)
    cantidad_registros = models.PositiveIntegerField(default=0)
    errores = models.JSONField(default=list, blank=True)
    generado_por = models.ForeignKey(
        "core.Usuario", on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        db_table = "ple_exportacion"
        verbose_name = "Exportación PLE"
        verbose_name_plural = "Exportaciones PLE"
        ordering = ["-creado_en"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(mes__gte=1) & models.Q(mes__lte=12),
                name="chk_exportacion_mes",
            )
        ]

    def __str__(self):
        return f"{self.libro} {self.anio}-{self.mes:02d} {self.nombre_archivo}"
