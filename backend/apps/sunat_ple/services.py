"""Generación de los libros PLE 12.1 y 13.1."""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.db.models import Sum

from apps.almacenes.models import Almacen
from apps.catalogo.models import Producto
from apps.common.utils import (
    formatear_decimal,
    hash_sha256,
    sanitizar_texto_ple,
    ultimo_dia_periodo,
)
from apps.core.models import Empresa
from apps.inventario.models import SaldoPeriodo
from apps.kardex.models import KardexValorizado
from apps.sunat_ple.validator import PleValidator

CODIGO_LIBRO = {"12.1": "120100", "13.1": "130100"}


@dataclass
class PleResultado:
    libro: str
    anio: int
    mes: int
    nombre_archivo: str
    contenido: str
    lineas: list[str] = field(default_factory=list)
    errores: list[dict] = field(default_factory=list)

    @property
    def cantidad_registros(self):
        return len(self.lineas)

    @property
    def hash(self):
        return hash_sha256(self.contenido)


class PleFilenameBuilder:
    @classmethod
    def construir(cls, empresa: Empresa, libro: str, anio: int, mes: int, con_contenido: bool):
        if libro not in CODIGO_LIBRO:
            raise ValueError("Libro PLE inválido.")
        moneda = "1" if empresa.moneda_principal == "PEN" else "2"
        operador = getattr(settings, "PLE_OPERADOR_INDICADOR", "1")
        indicador = "1" if con_contenido else "0"
        nombre = (
            f"LE{empresa.ruc}{anio}{mes:02d}00"
            f"{CODIGO_LIBRO[libro]}00{operador}{indicador}{moneda}1.TXT"
        )
        if len(nombre) != 37:  # 33 caracteres + .TXT
            raise ValueError(f"Máscara de nombre PLE inválida: {nombre}")
        return nombre


class PleService:
    @classmethod
    def saldos_iniciales(cls, empresa, anio: int, mes: int, almacen=None):
        """Calcula y guarda el saldo al inicio del periodo a partir del kardex."""
        inicio = date(anio, mes, 1)
        qs = KardexValorizado.objects.filter(empresa=empresa, fecha_operacion__lt=inicio)
        if almacen:
            qs = qs.filter(almacen=almacen)
        agregados = qs.values("almacen_id", "producto_id").annotate(
            entradas=Sum("cantidad_entrada"),
            salidas=Sum("cantidad_salida"),
            total_entradas=Sum("costo_total_entrada"),
            total_salidas=Sum("costo_total_salida"),
        )
        almacenes = Almacen.objects.in_bulk({a["almacen_id"] for a in agregados})
        productos = Producto.objects.in_bulk({a["producto_id"] for a in agregados})
        periodo = f"{anio}{mes:02d}"
        for fila in agregados:
            almacen_obj = almacenes.get(fila["almacen_id"])
            producto_obj = productos.get(fila["producto_id"])
            if not almacen_obj or not producto_obj:
                continue
            cantidad = (fila["entradas"] or Decimal("0")) - (fila["salidas"] or Decimal("0"))
            costo_total = (fila["total_entradas"] or Decimal("0")) - (
                fila["total_salidas"] or Decimal("0")
            )
            if cantidad < 0:
                cantidad = Decimal("0")
            if costo_total < 0:
                costo_total = Decimal("0")
            costo_unitario = (
                (costo_total / cantidad).quantize(Decimal("0.00000001"))
                if cantidad > 0
                else Decimal("0")
            )
            SaldoPeriodo.objects.update_or_create(
                empresa=empresa,
                almacen=almacen_obj,
                producto=producto_obj,
                periodo=periodo,
                defaults={
                    "cantidad": cantidad,
                    "costo_total": costo_total,
                    "costo_unitario": costo_unitario,
                },
            )

    @classmethod
    def generar(cls, empresa, libro: str, anio: int, mes: int, almacen=None) -> PleResultado:
        if libro not in CODIGO_LIBRO:
            raise ValueError("Libro PLE inválido.")
        if not 1 <= mes <= 12:
            raise ValueError("Mes inválido.")

        cls.saldos_iniciales(empresa, anio, mes, almacen)
        periodo = f"{anio}{mes:02d}"
        inicio = date(anio, mes, 1)
        fin = ultimo_dia_periodo(anio, mes)

        saldos_qs = SaldoPeriodo.objects.filter(empresa=empresa, periodo=periodo).select_related(
            "almacen", "producto"
        )
        if almacen:
            saldos_qs = saldos_qs.filter(almacen=almacen)
        saldos_qs = saldos_qs.order_by("almacen__codigo", "producto__sku")

        lineas: list[str] = []
        for saldo in saldos_qs:
            if saldo.cantidad == 0 and saldo.costo_total == 0:
                continue
            lineas.append(cls._linea_apertura(libro, empresa, saldo, inicio))

        kardex_qs = KardexValorizado.objects.filter(
            empresa=empresa,
            fecha_operacion__gte=inicio,
            fecha_operacion__lte=fin,
        ).select_related(
            "almacen",
            "producto",
            "movimiento_detalle__movimiento",
        )
        if almacen:
            kardex_qs = kardex_qs.filter(almacen=almacen)
        kardex_qs = kardex_qs.order_by("fecha_operacion", "secuencia", "id")

        for fila in kardex_qs:
            if libro == "12.1":
                lineas.append(cls._linea_12_1(fila))
            else:
                lineas.append(cls._linea_13_1(fila))

        nombre = PleFilenameBuilder.construir(empresa, libro, anio, mes, bool(lineas))
        contenido = "\r\n".join(lineas)
        if lineas:
            contenido += "\r\n"
        errores = PleValidator(libro, anio, mes).validar(lineas)
        return PleResultado(
            libro=libro,
            anio=anio,
            mes=mes,
            nombre_archivo=nombre,
            contenido=contenido,
            lineas=lineas,
            errores=errores,
        )

    # ------------------------------------------------------------------
    # Construcción de líneas
    # ------------------------------------------------------------------
    @classmethod
    def _campos_comunes(cls, fila, fecha_documento=None):
        descripcion = sanitizar_texto_ple(
            getattr(fila, "descripcion_producto", None) or fila.producto.descripcion,
            80,
        )
        return [
            f"{fila.fecha_operacion.strftime('%Y%m')}00"
            if hasattr(fila, "fecha_operacion")
            else "",
            getattr(fila, "cuo_contable", "") or "",
            getattr(fila, "correlativo_asiento", "") or "M1",
            fila.establecimiento_anexo
            if hasattr(fila, "establecimiento_anexo")
            else fila.almacen.codigo_sunat,
            getattr(fila, "catalogo_tipo", fila.producto.catalogo_tipo),
            getattr(fila, "tipo_existencia", fila.producto.tipo_existencia),
            getattr(fila, "codigo_propio_sunat", fila.producto.codigo_propio_sunat),
            getattr(fila, "catalogo_internacional", fila.producto.catalogo_internacional) or "",
            getattr(fila, "codigo_internacional", fila.producto.codigo_internacional) or "",
            (
                fecha_documento or getattr(fila, "fecha_documento", None) or fila.fecha_operacion
            ).strftime("%d/%m/%Y"),
            getattr(fila, "tipo_comprobante", "00") or "00",
            getattr(fila, "serie_comprobante", "0") or "0",
            getattr(fila, "numero_comprobante", "0") or "0",
            getattr(fila, "tipo_operacion", "16") or "16",
            descripcion,
            getattr(fila, "unidad_medida", fila.producto.unidad_medida),
        ]

    @classmethod
    def _linea_12_1(cls, fila: KardexValorizado) -> str:
        campos = cls._campos_comunes(fila)
        campos.extend(
            [
                formatear_decimal(fila.cantidad_entrada, 2),
                formatear_decimal(-fila.cantidad_salida, 2),
                getattr(fila, "estado_sunat", "1") or "1",
            ]
        )
        return "|".join(campos) + "|"

    @classmethod
    def _linea_13_1(cls, fila: KardexValorizado) -> str:
        campos = cls._campos_comunes(fila)
        campos.extend(
            [
                getattr(fila, "metodo_valuacion", fila.producto.metodo_valuacion),
                formatear_decimal(fila.cantidad_entrada, 8),
                formatear_decimal(fila.costo_unitario_entrada, 8),
                formatear_decimal(fila.costo_total_entrada, 2),
                formatear_decimal(-fila.cantidad_salida, 8),
                formatear_decimal(fila.costo_unitario_salida, 8),
                formatear_decimal(-fila.costo_total_salida, 2),
                formatear_decimal(fila.cantidad_saldo, 8),
                formatear_decimal(fila.costo_unitario_saldo, 8),
                formatear_decimal(fila.costo_total_saldo, 2),
                getattr(fila, "estado_sunat", "1") or "1",
            ]
        )
        return "|".join(campos) + "|"

    @classmethod
    def _linea_apertura(cls, libro, empresa, saldo: SaldoPeriodo, fecha: date) -> str:
        # Se construye un objeto ligero compatible con _campos_comunes.
        class _Apertura:
            pass

        fila = _Apertura()
        fila.almacen = saldo.almacen
        fila.producto = saldo.producto
        fila.fecha_operacion = fecha
        fila.periodo_aaaamm = saldo.periodo
        fila.establecimiento_anexo = saldo.almacen.codigo_sunat
        fila.catalogo_tipo = saldo.producto.catalogo_tipo
        fila.tipo_existencia = saldo.producto.tipo_existencia
        fila.codigo_propio_sunat = saldo.producto.codigo_propio_sunat
        fila.catalogo_internacional = saldo.producto.catalogo_internacional
        fila.codigo_internacional = saldo.producto.codigo_internacional
        fila.descripcion_producto = saldo.producto.descripcion
        fila.unidad_medida = saldo.producto.unidad_medida
        fila.metodo_valuacion = saldo.producto.metodo_valuacion
        fila.fecha_documento = fecha
        fila.tipo_comprobante = "00"
        fila.serie_comprobante = "0"
        fila.numero_comprobante = "0"
        fila.cuo_contable = f"CUO-{empresa.ruc}-APERTURA-{saldo.periodo}"
        fila.correlativo_asiento = "A1"
        fila.estado_sunat = "1"
        fila.tipo_operacion = "16"
        fila.cantidad_entrada = saldo.cantidad
        fila.costo_unitario_entrada = saldo.costo_unitario
        fila.costo_total_entrada = saldo.costo_total
        fila.cantidad_salida = Decimal("0")
        fila.costo_unitario_salida = Decimal("0")
        fila.costo_total_salida = Decimal("0")
        fila.cantidad_saldo = saldo.cantidad
        fila.costo_unitario_saldo = saldo.costo_unitario
        fila.costo_total_saldo = saldo.costo_total

        if libro == "12.1":
            return cls._linea_12_1(fila)
        return cls._linea_13_1(fila)
