import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.common.models import BaseModel
from apps.core.managers import UsuarioManager
from apps.core.validators import validar_ruc


class Usuario(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    email = models.EmailField("correo electrónico", unique=True)
    telefono = models.CharField(max_length=20, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UsuarioManager()

    class Meta:
        db_table = "core_usuario"
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"

    def __str__(self):
        return self.email

    @property
    def nombre_completo(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email


class Empresa(BaseModel):
    ruc = models.CharField(
        max_length=11,
        unique=True,
        validators=[validar_ruc],
        help_text="RUC peruano de 11 dígitos con dígito verificador.",
    )
    razon_social = models.CharField(max_length=200)
    nombre_comercial = models.CharField(max_length=200, blank=True)
    es_oficial = models.BooleanField(
        default=True, help_text="True=Oficial fiscal, False=Prueba/Sandbox"
    )
    moneda_principal = models.CharField(
        max_length=3,
        default="PEN",
        choices=[("PEN", "Soles"), ("USD", "Dólares")],
    )
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "core_empresa"
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"
        ordering = ["razon_social"]

    def __str__(self):
        return f"{self.ruc} - {self.razon_social}"


class UsuarioEmpresa(BaseModel):
    class Rol(models.TextChoices):
        ADMIN = "ADMIN", "Administrador"
        JEFE = "JEFE", "Jefe de almacén"
        OPERADOR = "OPERADOR", "Operador"
        CONSULTA = "CONSULTA", "Consulta"
        AUDITOR = "AUDITOR", "Auditor"

    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="empresas")
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="usuarios")
    rol = models.CharField(max_length=20, choices=Rol.choices, default=Rol.OPERADOR)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "core_usuario_empresa"
        verbose_name = "Usuario de empresa"
        verbose_name_plural = "Usuarios de empresa"
        constraints = [
            models.UniqueConstraint(fields=["usuario", "empresa"], name="uniq_usuario_empresa")
        ]

    def __str__(self):
        return f"{self.usuario.email} - {self.empresa.razon_social} ({self.rol})"


class SunatTabla(BaseModel):
    tabla_numero = models.PositiveSmallIntegerField(db_index=True)
    codigo = models.CharField(max_length=10, db_index=True)
    descripcion = models.CharField(max_length=255)
    activo = models.BooleanField(default=True)
    vigente_desde = models.DateField(null=True, blank=True)
    vigente_hasta = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "core_sunat_tabla"
        verbose_name = "Tabla SUNAT"
        verbose_name_plural = "Tablas SUNAT"
        constraints = [
            models.UniqueConstraint(
                fields=["tabla_numero", "codigo"], name="uniq_sunat_tabla_codigo"
            )
        ]
        ordering = ["tabla_numero", "codigo"]

    def __str__(self):
        return f"[Tabla {self.tabla_numero}] {self.codigo} - {self.descripcion}"


class Secuencia(BaseModel):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="secuencias")
    tipo = models.CharField(max_length=30)
    anio = models.PositiveSmallIntegerField()
    ultimo = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "core_secuencia"
        constraints = [
            models.UniqueConstraint(
                fields=["empresa", "tipo", "anio"], name="uniq_secuencia_empresa_tipo"
            )
        ]

    def __str__(self):
        return f"{self.empresa.ruc} {self.tipo} {self.anio}: {self.ultimo}"


class CierrePeriodo(BaseModel):
    class Estado(models.TextChoices):
        ABIERTO = "ABIERTO", "Abierto"
        CERRADO = "CERRADO", "Cerrado"

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="cierres_periodo")
    anio = models.PositiveSmallIntegerField()
    mes = models.PositiveSmallIntegerField()
    estado = models.CharField(max_length=10, choices=Estado.choices, default=Estado.CERRADO)
    cerrado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True)
    cerrado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "core_cierre_periodo"
        constraints = [
            models.UniqueConstraint(fields=["empresa", "anio", "mes"], name="uniq_cierre_periodo"),
            models.CheckConstraint(
                condition=models.Q(mes__gte=1) & models.Q(mes__lte=12),
                name="chk_cierre_mes",
            ),
        ]
        ordering = ["-anio", "-mes"]

    def __str__(self):
        return f"{self.empresa.ruc} {self.anio}-{self.mes:02d} {self.estado}"


class EventoAuditoria(BaseModel):
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eventos_auditoria",
    )
    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True)
    entidad = models.CharField(max_length=50)
    entidad_id = models.CharField(max_length=50)
    accion = models.CharField(max_length=30)
    datos = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "core_evento_auditoria"
        ordering = ["-creado_en"]
        indexes = [models.Index(fields=["empresa", "entidad", "entidad_id"])]

    def __str__(self):
        return f"{self.accion} {self.entidad}:{self.entidad_id}"
