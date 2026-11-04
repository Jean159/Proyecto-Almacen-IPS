from datetime import date
from decimal import Decimal

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.almacenes.models import Almacen, Ubicacion
from apps.catalogo.models import CategoriaProducto, LoteSerie, Producto
from apps.core.models import Empresa, Usuario, UsuarioEmpresa
from apps.kardex.models import KardexValorizado
from apps.movimientos.services import MovimientoService


class Command(BaseCommand):
    help = "Crea una empresa demo, almacenes, productos y movimientos de ejemplo."

    @transaction.atomic
    def handle(self, *args, **options):
        call_command("seed_sunat")
        empresa, _ = Empresa.objects.get_or_create(
            ruc="20123456786",
            defaults={
                "razon_social": "Comercial Demo S.A.C.",
                "nombre_comercial": "Demo Almacén",
                "moneda_principal": "PEN",
            },
        )
        usuario, creado = Usuario.objects.get_or_create(
            email="admin@demo.pe",
            defaults={
                "first_name": "Admin",
                "last_name": "Demo",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if creado:
            usuario.set_password("admin12345")
            usuario.save(update_fields=["password"])
        UsuarioEmpresa.objects.get_or_create(
            usuario=usuario,
            empresa=empresa,
            defaults={"rol": UsuarioEmpresa.Rol.ADMIN},
        )

        almacen_central, _ = Almacen.objects.get_or_create(
            empresa=empresa,
            codigo="ALM-001",
            defaults={
                "codigo_establecimiento": "0001",
                "nombre": "Almacén Central",
                "direccion": "Av. Los Almacenes 123, Lima",
                "ubigeo": "150101",
            },
        )
        almacen_tienda, _ = Almacen.objects.get_or_create(
            empresa=empresa,
            codigo="ALM-002",
            defaults={
                "codigo_establecimiento": "0002",
                "nombre": "Almacén Tienda",
                "direccion": "Av. Comercial 456, Lima",
                "ubigeo": "150101",
            },
        )
        ubicacion, _ = Ubicacion.objects.get_or_create(
            almacen=almacen_central,
            codigo="PAS-01-RACK-01",
            defaults={"descripcion": "Pasillo 1, rack 1"},
        )
        categoria, _ = CategoriaProducto.objects.get_or_create(
            empresa=empresa, nombre="General", defaults={}
        )
        producto_pp, _ = Producto.objects.get_or_create(
            empresa=empresa,
            sku="SKU-001",
            defaults={
                "categoria": categoria,
                "descripcion": "Producto promedio ponderado",
                "tipo_existencia": "01",
                "unidad_medida": "NIU",
                "catalogo_tipo": "9",
                "codigo_propio_sunat": "PROD001",
                "metodo_valuacion": "1",
                "stock_minimo": Decimal("5"),
            },
        )
        producto_fifo, _ = Producto.objects.get_or_create(
            empresa=empresa,
            sku="SKU-002",
            defaults={
                "categoria": categoria,
                "descripcion": "Producto FIFO",
                "tipo_existencia": "01",
                "unidad_medida": "NIU",
                "catalogo_tipo": "9",
                "codigo_propio_sunat": "PROD002",
                "metodo_valuacion": "2",
                "stock_minimo": Decimal("2"),
            },
        )
        producto_lote, _ = Producto.objects.get_or_create(
            empresa=empresa,
            sku="SKU-003",
            defaults={
                "categoria": categoria,
                "descripcion": "Producto con lote",
                "tipo_existencia": "01",
                "unidad_medida": "NIU",
                "catalogo_tipo": "9",
                "codigo_propio_sunat": "PROD003",
                "metodo_valuacion": "2",
                "control_lotes": True,
            },
        )
        lote, _ = LoteSerie.objects.get_or_create(
            producto=producto_lote,
            numero_lote_serie="LOTE-2026-001",
            defaults={"fecha_vencimiento": date(2027, 12, 31)},
        )

        if KardexValorizado.objects.filter(empresa=empresa).exists():
            self.stdout.write(
                self.style.WARNING("La empresa demo ya tiene kardex; no se crean movimientos.")
            )
            return

        hoy = date.today()
        inicio = hoy.replace(day=1)

        def crear_movimiento(**data):
            mov = MovimientoService.crear_borrador(empresa, usuario, data)
            MovimientoService.confirmar(mov, usuario)
            return mov

        # Apertura de stock
        crear_movimiento(
            tipo_movimiento="ENTRADA",
            tipo_operacion_sunat="16",
            tipo_comprobante_sunat="00",
            fecha_operacion=inicio,
            almacen=almacen_central,
            glosa="Saldo inicial de demostración",
            detalles=[
                {
                    "producto": producto_pp,
                    "ubicacion": ubicacion,
                    "cantidad": Decimal("10"),
                    "costo_unitario": Decimal("10"),
                },
                {
                    "producto": producto_fifo,
                    "ubicacion": ubicacion,
                    "cantidad": Decimal("5"),
                    "costo_unitario": Decimal("20"),
                },
                {
                    "producto": producto_lote,
                    "ubicacion": ubicacion,
                    "lote_serie": lote,
                    "cantidad": Decimal("3"),
                    "costo_unitario": Decimal("5"),
                },
            ],
        )

        # Venta de una unidad
        crear_movimiento(
            tipo_movimiento="SALIDA",
            tipo_operacion_sunat="01",
            tipo_comprobante_sunat="01",
            serie_comprobante="F001",
            numero_comprobante="00000001",
            fecha_operacion=hoy,
            almacen=almacen_central,
            glosa="Venta de demostración",
            detalles=[
                {
                    "producto": producto_pp,
                    "ubicacion": ubicacion,
                    "cantidad": Decimal("2"),
                }
            ],
        )

        # Transferencia entre almacenes
        crear_movimiento(
            tipo_movimiento="TRANSFERENCIA",
            tipo_operacion_sunat="11",
            tipo_comprobante_sunat="00",
            fecha_operacion=hoy,
            almacen=almacen_central,
            almacen_destino=almacen_tienda,
            glosa="Transferencia de demostración",
            detalles=[
                {
                    "producto": producto_fifo,
                    "ubicacion": ubicacion,
                    "cantidad": Decimal("1"),
                }
            ],
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Demo creada. Usuario: admin@demo.pe / admin12345. "
                f"Empresa: {empresa.ruc}. Almacenes: {almacen_central.codigo}, {almacen_tienda.codigo}."
            )
        )
