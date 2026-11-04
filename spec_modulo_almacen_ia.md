# ESPECIFICACIÓN TÉCNICA Y PROMPT MASTER PARA IA: MÓDULO DE ALMACÉN E INVENTARIOS (ERP PERÚ - SUNAT)

> **Instrucción para el Modelo de IA (Claude, Cursor, Copilot, ChatGPT):**
> Actúa como un Arquitecto de Software Senior y Tech Lead Full-Stack especializado en sistemas ERP y normativa tributaria SUNAT (Perú). Tu misión es implementar el módulo de **Almacén (Gestión de Inventario Permanente y Kardex Valorizado)** para un ERP empresarial multiempresa y multialmacén.
> 
> **Stack Obligatorio:**
> - **Backend:** Python 3.11+, Django 5.x, Django REST Framework (DRF), PostgreSQL 16.
> - **Frontend:** React 18+, TypeScript 5+, Vite, Tailwind CSS 3+, TanStack Query (React Query v5), Zustand, React Hook Form, Zod, Lucide React.
> - **Base Normativa:** SUNAT PLE (Libros 12.1 y 13.1), Tablas Maestras 5, 6, 10, 11, 12, 13, 14, PCGE 2019/2020.

---

## 1. ESTRUCTURA DEL PROYECTO (MONOREPO)

```text
erp-monorepo/
├── backend/
│   ├── config/                  # Settings, wsgi, asgi, urls principales
│   ├── apps/
│   │   ├── core/                # Empresa (Tenant), Usuarios, Auditoría, Tablas SUNAT
│   │   ├── almacenes/           # Sedes, Almacenes, Zonas, Ubicaciones (Pasillo/Rack/Nivel)
│   │   ├── catalogo/            # Categorías, Productos, Variantes, Lotes y Series
│   │   ├── inventario/          # StockSaldo, Alertas, Reservas de Stock
│   │   ├── movimientos/         # MovimientoInventario, MovimientoDetalle (Entradas/Salidas/Transf.)
│   │   ├── kardex/              # Motor de Valuación (Promedio Ponderado / FIFO), KardexValorizado
│   │   ├── sunat_ple/           # Generador y Validador de Libros Electrónicos 12.1 y 13.1
│   │   └── integraciones/       # APIs para Ventas POS/Web, Compras, Distribución, Contabilidad
│   ├── requirements.txt
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── api/                 # Clientes Axios y endpoints centralizados
│   │   ├── components/          # Componentes UI reutilizables (Botones, Modales, Tablas, Badges)
│   │   ├── features/
│   │   │   ├── almacenes/       # Gestión de almacenes y ubicaciones físicas
│   │   │   ├── catalogo/        # CRUD productos, ficha técnica, códigos SUNAT/CUBSO
│   │   │   ├── stock/           # Monitor de stock en tiempo real, alertas de quiebre
│   │   │   ├── movimientos/     # Wizards de entradas, salidas y transferencias
│   │   │   ├── kardex/          # Vista interactiva de Kardex Físico y Valorizado
│   │   │   └── ple/             # Centro de descarga y validación previa de PLE 12.1 / 13.1
│   │   ├── hooks/               # Custom hooks (useKardex, useStock, useSunatCatalog)
│   │   ├── stores/              # Zustand (authStore, empresaStore, almacenStore)
│   │   ├── types/               # Definiciones TypeScript de modelos y contratos API
│   │   └── App.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── docs/                        # Diagramas de arquitectura y contratos OpenAPI
```

---

## 2. MODELO DE DATOS POSTGRESQL (DJANGO MODELS)

### 2.1. Núcleo Multiempresa y Catálogos SUNAT (`apps/core/models.py`)

```python
import uuid
from django.db import models
from django.core.validators import RegexValidator

class EmpresaTenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ruc = models.CharField(
        max_length=11, 
        unique=True,
        validators=[RegexValidator(r'^(10|20|15|17)[0-9]{9}$', 'RUC peruano inválido')]
    )
    razon_social = models.CharField(max_length=200)
    nombre_comercial = models.CharField(max_length=200, blank=True)
    es_oficial = models.BooleanField(default=True, help_text="True=Oficial fiscal, False=Prueba/Sandbox")
    moneda_principal = models.CharField(max_length=3, default='PEN', choices=[('PEN', 'Soles'), ('USD', 'Dólares')])
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'core_empresa_tenant'
        verbose_name = 'Empresa (Tenant)'

    def __str__(self):
        return f"{self.ruc} - {self.razon_social} ({'OFICIAL' if self.es_oficial else 'SANDBOX'})"

class SunatTablaParametro(models.Model):
    """Parámetros maestros de tablas SUNAT (Tablas 5, 6, 10, 11, 12, 13, 14, 17)"""
    tabla_numero = models.IntegerField(db_index=True, help_text="Ej: 5 para existencias, 12 para operaciones")
    codigo = models.CharField(max_length=10, db_index=True)
    descripcion = models.CharField(max_length=255)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'core_sunat_parametro'
        unique_together = ('tabla_numero', 'codigo')

    def __str__(self):
        return f"[Tab.{self.tabla_numero}] {self.codigo} - {self.descripcion}"
```

### 2.2. Almacenes y Ubicaciones Físicas (`apps/almacenes/models.py`)

```python
import uuid
from django.db import models
from apps.core.models import EmpresaTenant

class Almacen(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(EmpresaTenant, on_delete=models.CASCADE, related_name='almacenes')
    codigo_sunat = models.CharField(
        max_length=7,
        help_text="4 dígitos de establecimiento anexo SUNAT + 3 correlativos (o '9999' para terceros)"
    )
    nombre = models.CharField(max_length=100)
    direccion = models.CharField(max_length=250)
    ubigeo = models.CharField(max_length=6, blank=True)
    es_almacen_tercero = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'almacen_sede'
        unique_together = ('empresa', 'codigo_sunat')

    def __str__(self):
        return f"[{self.codigo_sunat}] {self.nombre}"

class Ubicacion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    almacen = models.ForeignKey(Almacen, on_delete=models.CASCADE, related_name='ubicaciones')
    codigo = models.CharField(max_length=30, help_text="Ej: PAS-01-RACK-02-NIV-03")
    descripcion = models.CharField(max_length=100, blank=True)
    capacidad_peso_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    capacidad_volumen_m3 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = 'almacen_ubicacion'
        unique_together = ('almacen', 'codigo')
```

### 2.3. Catálogo de Productos y Lotes/Series (`apps/catalogo/models.py`)

```python
import uuid
from django.db import models
from apps.core.models import EmpresaTenant

class CategoriaProducto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(EmpresaTenant, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subcategorias')
    cuenta_contable_inventario = models.CharField(max_length=24, default='20111', help_text="Subcuenta PCGE")
    cuenta_contable_costo_venta = models.CharField(max_length=24, default='69111', help_text="Subcuenta PCGE")

    class Meta:
        db_table = 'catalogo_categoria'

class Producto(models.Model):
    METODOS_VALUACION = [
        ('1', 'Promedio Ponderado'),
        ('2', 'Primeras Entradas Primeras Salidas (PEPS / FIFO)'),
        ('5', 'Identificación Específica')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(EmpresaTenant, on_delete=models.CASCADE, related_name='productos')
    categoria = models.ForeignKey(CategoriaProducto, on_delete=models.SET_NULL, null=True, blank=True)
    sku = models.CharField(max_length=50, db_index=True)
    codigo_barras = models.CharField(max_length=50, blank=True, db_index=True)
    descripcion = models.CharField(max_length=250)
    
    # Atributos SUNAT Oficiales
    tipo_existencia = models.CharField(max_length=2, default='01', help_text="Tabla 5 SUNAT (01 Mercadería, 02 PT, 03 MP)")
    unidad_medida = models.CharField(max_length=3, default='NIU', help_text="Tabla 6 SUNAT (NIU, KGM, LTR)")
    catalogo_tipo = models.CharField(max_length=1, default='9', choices=[('1', 'UNSPSC'), ('3', 'GS1 EAN'), ('9', 'Propio')])
    codigo_propio_sunat = models.CharField(max_length=24, help_text="Campo 4 PLE 12.1/13.1")
    cubso_osce = models.CharField(max_length=16, blank=True, default='0000000000000000', help_text="16 dígitos OSCE")
    metodo_valuacion = models.CharField(max_length=1, default='1', choices=METODOS_VALUACION)
    
    # Controles Operativos Genéricos
    control_lotes = models.BooleanField(default=False)
    control_series = models.BooleanField(default=False)
    stock_minimo = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    stock_maximo = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    punto_reorden = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    
    # Metadatos para giros de negocio específicos (JSONB)
    # Ej: Farmacia: {principio_activo: "Paracetamol", concentracion: "500mg"}
    # Ej: Calzado: {talla: "42", color: "Negro", material: "Cuero"}
    atributos_extra = models.JSONBField(default=dict, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'catalogo_producto'
        unique_together = ('empresa', 'sku')

    def __str__(self):
        return f"[{self.sku}] {self.descripcion}"

class LoteSerie(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='lotes_series')
    numero_lote_serie = models.CharField(max_length=50, db_index=True)
    fecha_fabricacion = models.DateField(null=True, blank=True)
    fecha_vencimiento = models.DateField(null=True, blank=True, db_index=True)
    estado = models.CharField(max_length=20, default='DISPONIBLE', choices=[('DISPONIBLE', 'Disponible'), ('CUARENTENA', 'En Cuarentena'), ('VENCIDO', 'Vencido')])

    class Meta:
        db_table = 'catalogo_lote_serie'
        unique_together = ('producto', 'numero_lote_serie')
```

### 2.4. Saldos de Stock en Tiempo Real (`apps/inventario/models.py`)

```python
import uuid
from django.db import models
from apps.almacenes.models import Almacen, Ubicacion
from apps.catalogo.models import Producto, LoteSerie

class StockSaldo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    almacen = models.ForeignKey(Almacen, on_delete=models.CASCADE, related_name='saldos')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='saldos')
    ubicacion = models.ForeignKey(Ubicacion, on_delete=models.SET_NULL, null=True, blank=True)
    lote_serie = models.ForeignKey(LoteSerie, on_delete=models.SET_NULL, null=True, blank=True)
    
    cantidad_fisica = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    cantidad_reservada = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    
    ultima_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventario_stock_saldo'
        unique_together = ('almacen', 'producto', 'ubicacion', 'lote_serie')
        indexes = [
            models.Index(fields=['almacen', 'producto']),
        ]

    @property
    def cantidad_disponible(self):
        return self.cantidad_fisica - self.cantidad_reservada
```

### 2.5. Movimientos y Kardex Inmutable (`apps/movimientos/models.py` y `apps/kardex/models.py`)

```python
import uuid
from django.db import models
from django.conf import settings
from apps.core.models import EmpresaTenant
from apps.almacenes.models import Almacen, Ubicacion
from apps.catalogo.models import Producto, LoteSerie

class MovimientoInventario(models.Model):
    TIPOS_MOV = [
        ('ENTRADA', 'Entrada de Mercadería'),
        ('SALIDA', 'Salida de Mercadería'),
        ('TRANSFERENCIA', 'Transferencia entre Almacenes'),
        ('AJUSTE', 'Ajuste de Inventario')
    ]
    ESTADOS = [
        ('BORRADOR', 'Borrador'),
        ('CONFIRMADO', 'Confirmado (Afecta Stock y Kardex)'),
        ('ANULADO', 'Anulado')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(EmpresaTenant, on_delete=models.CASCADE)
    correlativo_interno = models.CharField(max_length=20, db_index=True)
    tipo_movimiento = models.CharField(max_length=15, choices=TIPOS_MOV)
    
    # Atributos SUNAT Tablas 10 y 12
    tipo_operacion_sunat = models.CharField(max_length=2, default='01', help_text="Tabla 12 (01 Venta, 02 Compra, etc.)")
    tipo_comprobante_sunat = models.CharField(max_length=2, default='00', help_text="Tabla 10 (01 Factura, 09 Guía, 00 Doc Interno)")
    serie_comprobante = models.CharField(max_length=20, default='0')
    numero_comprobante = models.CharField(max_length=20, default='0')
    fecha_emision_comprobante = models.DateField()
    
    # Almacenes participantes
    almacen_origen = models.ForeignKey(Almacen, on_delete=models.CASCADE, related_name='movimientos_salida')
    almacen_destino = models.ForeignKey(Almacen, on_delete=models.CASCADE, null=True, blank=True, related_name='movimientos_entrada')
    
    # Trazabilidad Contable SUNAT
    cuo_contable = models.CharField(max_length=40, blank=True, help_text="Código Único de Operación contable")
    correlativo_asiento = models.CharField(max_length=10, blank=True, default='M1')
    estado_sunat = models.CharField(max_length=1, default='1', choices=[('1', 'Periodo actual'), ('8', 'Omitido anterior'), ('9', 'Rectificatoria')])
    
    glosa = models.CharField(max_length=200, blank=True)
    estado = models.CharField(max_length=15, default='CONFIRMADO', choices=ESTADOS)
    usuario_registro = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'movimiento_inventario'

class MovimientoDetalle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    movimiento = models.ForeignKey(MovimientoInventario, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT)
    ubicacion_origen = models.ForeignKey(Ubicacion, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    ubicacion_destino = models.ForeignKey(Ubicacion, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    lote_serie = models.ForeignKey(LoteSerie, on_delete=models.SET_NULL, null=True, blank=True)
    
    cantidad = models.DecimalField(max_digits=18, decimal_places=4)
    costo_unitario = models.DecimalField(max_digits=18, decimal_places=8, default=0)
    costo_total = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    class Meta:
        db_table = 'movimiento_detalle'

class KardexValorizado(models.Model):
    """
    Libro Auxiliar Inmutable de Inventario Permanente Valorizado (PLE SUNAT 13.1).
    Solo inserción (Append-only). Prohibido DELETE y UPDATE directo.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(EmpresaTenant, on_delete=models.CASCADE)
    almacen = models.ForeignKey(Almacen, on_delete=models.CASCADE)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    movimiento_detalle = models.OneToOneField(MovimientoDetalle, on_delete=models.CASCADE, related_name='kardex_registro')
    
    periodo_aaaamm = models.CharField(max_length=6, db_index=True)
    fecha_operacion = models.DateTimeField(db_index=True)
    tipo_operacion = models.CharField(max_length=2)
    
    # Entradas
    cantidad_entrada = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    costo_unitario_entrada = models.DecimalField(max_digits=18, decimal_places=8, default=0)
    costo_total_entrada = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    
    # Salidas
    cantidad_salida = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    costo_unitario_salida = models.DecimalField(max_digits=18, decimal_places=8, default=0)
    costo_total_salida = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    
    # Saldos Acumulados tras la Operación
    cantidad_saldo = models.DecimalField(max_digits=18, decimal_places=4)
    costo_unitario_saldo = models.DecimalField(max_digits=18, decimal_places=8)
    costo_total_saldo = models.DecimalField(max_digits=18, decimal_places=2)

    class Meta:
        db_table = 'kardex_valorizado'
        ordering = ['fecha_operacion', 'id']
        indexes = [
            models.Index(fields=['empresa', 'almacen', 'producto', 'periodo_aaaamm']),
        ]
```

---

## 3. LÓGICA DE NEGOCIO: MOTOR DE VALUACIÓN (FIFO Y PROMEDIO PONDERADO)

Crea el archivo `apps/kardex/services.py`:

```python
from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError
from apps.inventario.models import StockSaldo
from apps.kardex.models import KardexValorizado
from apps.movimientos.models import MovimientoInventario, MovimientoDetalle

class KardexValuationEngine:
    """Motor de cálculo y valuación de inventario con algoritmos Promedio Ponderado y PEPS/FIFO"""

    @classmethod
    @transaction.atomic
    def procesar_movimiento_confirmado(cls, movimiento: MovimientoInventario):
        for detalle in movimiento.detalles.all():
            if movimiento.tipo_movimiento == 'ENTRADA':
                cls._procesar_entrada(movimiento, detalle)
            elif movimiento.tipo_movimiento == 'SALIDA':
                cls._procesar_salida(movimiento, detalle)
            elif movimiento.tipo_movimiento == 'TRANSFERENCIA':
                cls._procesar_transferencia(movimiento, detalle)

    @classmethod
    def _procesar_entrada(cls, mov: MovimientoInventario, det: MovimientoDetalle):
        # 1. Bloqueo transaccional de stock con select_for_update()
        stock, _ = StockSaldo.objects.select_for_update().get_or_create(
            almacen=mov.almacen_origen,
            producto=det.producto,
            ubicacion=det.ubicacion_origen,
            lote_serie=det.lote_serie,
            defaults={'cantidad_fisica': Decimal('0')}
        )
        
        # 2. Obtener último saldo del Kardex
        ultimo_kardex = KardexValorizado.objects.filter(
            almacen=mov.almacen_origen,
            producto=det.producto
        ).order_by('-fecha_operacion', '-id').first()

        saldo_ant_cant = ultimo_kardex.cantidad_saldo if ultimo_kardex else Decimal('0')
        saldo_ant_total = ultimo_kardex.costo_total_saldo if ultimo_kardex else Decimal('0')

        # 3. Cálculos de nuevo saldo
        nueva_cant = saldo_ant_cant + det.cantidad
        nuevo_total = saldo_ant_total + det.costo_total
        nuevo_cu = (nuevo_total / nueva_cant).quantize(Decimal('0.00000001')) if nueva_cant > 0 else Decimal('0')

        # 4. Registrar tupla en Kardex
        KardexValorizado.objects.create(
            empresa=mov.empresa,
            almacen=mov.almacen_origen,
            producto=det.producto,
            movimiento_detalle=det,
            periodo_aaaamm=mov.fecha_emision_comprobante.strftime('%Y%m'),
            fecha_operacion=mov.fecha_operacion if hasattr(mov, 'fecha_operacion') else mov.creado_en,
            tipo_operacion=mov.tipo_operacion_sunat,
            cantidad_entrada=det.cantidad,
            costo_unitario_entrada=det.costo_unitario,
            costo_total_entrada=det.costo_total,
            cantidad_salida=Decimal('0'),
            costo_unitario_salida=Decimal('0'),
            costo_total_salida=Decimal('0'),
            cantidad_saldo=nueva_cant,
            costo_unitario_saldo=nuevo_cu,
            costo_total_saldo=nuevo_total
        )

        # 5. Actualizar Stock físico
        stock.cantidad_fisica += det.cantidad
        stock.save()

    @classmethod
    def _procesar_salida(cls, mov: MovimientoInventario, det: MovimientoDetalle):
        stock = StockSaldo.objects.select_for_update().filter(
            almacen=mov.almacen_origen,
            producto=det.producto,
            ubicacion=det.ubicacion_origen,
            lote_serie=det.lote_serie
        ).first()

        if not stock or stock.cantidad_disponible < det.cantidad:
            raise ValidationError(f"Stock insuficiente para {det.producto.sku}. Disp: {stock.cantidad_disponible if stock else 0}, Solicitado: {det.cantidad}")

        ultimo_kardex = KardexValorizado.objects.filter(
            almacen=mov.almacen_origen,
            producto=det.producto
        ).order_by('-fecha_operacion', '-id').first()

        if not ultimo_kardex or ultimo_kardex.cantidad_saldo < det.cantidad:
            raise ValidationError(f"Inconsistencia en Kardex: Saldo insuficiente de {det.producto.sku}")

        # Método Promedio Ponderado
        cu_salida = ultimo_kardex.costo_unitario_saldo
        total_salida = (det.cantidad * cu_salida).quantize(Decimal('0.01'))

        nueva_cant = ultimo_kardex.cantidad_saldo - det.cantidad
        nuevo_total = ultimo_kardex.costo_total_saldo - total_salida
        nuevo_cu = (nuevo_total / nueva_cant).quantize(Decimal('0.00000001')) if nueva_cant > 0 else Decimal('0')

        det.costo_unitario = cu_salida
        det.costo_total = total_salida
        det.save()

        KardexValorizado.objects.create(
            empresa=mov.empresa,
            almacen=mov.almacen_origen,
            producto=det.producto,
            movimiento_detalle=det,
            periodo_aaaamm=mov.fecha_emision_comprobante.strftime('%Y%m'),
            fecha_operacion=mov.creado_en,
            tipo_operacion=mov.tipo_operacion_sunat,
            cantidad_entrada=Decimal('0'),
            costo_unitario_entrada=Decimal('0'),
            costo_total_entrada=Decimal('0'),
            cantidad_salida=det.cantidad,
            costo_unitario_salida=cu_salida,
            costo_total_salida=total_salida,
            cantidad_saldo=nueva_cant,
            costo_unitario_saldo=nuevo_cu,
            costo_total_saldo=nuevo_total
        )

        stock.cantidad_fisica -= det.cantidad
        stock.save()
```

---

## 4. GENERADOR Y VALIDADOR DE ARCHIVOS PLE SUNAT (12.1 Y 13.1)

Crea `apps/sunat_ple/services.py`:

```python
import io
from apps.kardex.models import KardexValorizado

class SunatPleExporter:
    """Generador oficial de archivos planos .TXT para el PLE según Resolución de Superintendencia"""

    @classmethod
    def generar_libro_12_1_unidades_fisicas(cls, empresa, anio: int, mes: int) -> tuple[str, str]:
        """
        Libro 12.1: Registro de Inventario Permanente en Unidades Físicas.
        Nombre: LE{RUC}{AAAA}{MM}00120100001111.TXT
        """
        periodo_str = f"{anio}{str(mes).zfill(2)}"
        registros = KardexValorizado.objects.filter(
            empresa=empresa,
            periodo_aaaamm=periodo_str
        ).select_related('almacen', 'producto', 'movimiento_detalle__movimiento').order_by('fecha_operacion')

        output = io.StringIO()
        indicador_contenido = '1' if registros.exists() else '0'
        nombre_archivo = f"LE{empresa.ruc}{anio}{str(mes).zfill(2)}00120100001{indicador_contenido}11.TXT"

        for r in registros:
            mov = r.movimiento_detalle.movimiento
            # Estructura de 18 campos obligatorios separados por PIPE (|)
            linea = [
                f"{periodo_str}00",                           # 1. Periodo AAAAMM00
                mov.cuo_contable or f"M{mov.correlativo_interno}", # 2. CUO
                mov.correlativo_asiento or "M1",              # 3. Correlativo Asiento
                r.almacen.codigo_sunat,                       # 4. Establecimiento anexo (4+3)
                r.producto.catalogo_tipo,                     # 5. Catálogo (1/3/9)
                r.producto.tipo_existencia,                   # 6. Tipo Existencia (Tab. 5)
                r.producto.codigo_propio_sunat,               # 7. Código propio ítem
                r.producto.cubso_osce or "0000000000000000",  # 8. CUBSO OSCE (16 dígitos)
                mov.fecha_emision_comprobante.strftime('%d/%m/%Y'), # 9. Fecha traslado/emisión
                mov.tipo_comprobante_sunat,                   # 10. Tipo Comprobante (Tab. 10)
                mov.serie_comprobante or "0",                 # 11. Serie comprobante
                mov.numero_comprobante or "0",                # 12. Número comprobante
                r.tipo_operacion,                             # 13. Tipo Operación (Tab. 12)
                r.producto.descripcion.replace('|', '')[:80], # 14. Descripción ítem
                r.producto.unidad_medida,                     # 15. Unidad Medida (Tab. 6)
                f"{r.cantidad_entrada:.2f}",                  # 16. Entradas físicas
                f"{r.cantidad_salida:.2f}",                   # 17. Salidas físicas
                mov.estado_sunat                              # 18. Estado operación (1/8/9)
            ]
            output.write("|".join(linea) + "|\r\n")

        return nombre_archivo, output.getvalue()

    @classmethod
    def generar_libro_13_1_inventario_valorizado(cls, empresa, anio: int, mes: int) -> tuple[str, str]:
        """
        Libro 13.1: Registro de Inventario Permanente Valorizado.
        Nombre: LE{RUC}{AAAA}{MM}00130100001111.TXT
        """
        periodo_str = f"{anio}{str(mes).zfill(2)}"
        registros = KardexValorizado.objects.filter(
            empresa=empresa,
            periodo_aaaamm=periodo_str
        ).select_related('almacen', 'producto', 'movimiento_detalle__movimiento').order_by('fecha_operacion')

        output = io.StringIO()
        indicador_contenido = '1' if registros.exists() else '0'
        nombre_archivo = f"LE{empresa.ruc}{anio}{str(mes).zfill(2)}00130100001{indicador_contenido}11.TXT"

        for r in registros:
            mov = r.movimiento_detalle.movimiento
            linea = [
                f"{periodo_str}00",                           # 1. Periodo
                mov.cuo_contable or f"M{mov.correlativo_interno}", # 2. CUO
                mov.correlativo_asiento or "M1",              # 3. Correlativo Asiento
                r.almacen.codigo_sunat,                       # 4. Establecimiento anexo
                r.producto.catalogo_tipo,                     # 5. Catálogo utilizado
                r.producto.tipo_existencia,                   # 6. Tipo Existencia
                r.producto.codigo_propio_sunat,               # 7. Código propio
                r.producto.cubso_osce or "0000000000000000",  # 8. CUBSO OSCE
                mov.fecha_emision_comprobante.strftime('%d/%m/%Y'), # 9. Fecha
                mov.tipo_comprobante_sunat,                   # 10. Tipo Comprobante
                mov.serie_comprobante or "0",                 # 11. Serie
                mov.numero_comprobante or "0",                # 12. Número
                r.tipo_operacion,                             # 13. Tipo Operación
                r.producto.descripcion.replace('|', '')[:80], # 14. Descripción
                r.producto.unidad_medida,                     # 15. Unidad Medida
                r.producto.metodo_valuacion,                  # 16. Método Valuación (Tab. 14)
                f"{r.cantidad_entrada:.8f}",                  # 17. Cantidad entrada
                f"{r.costo_unitario_entrada:.8f}",            # 18. Costo Unitario entrada
                f"{r.costo_total_entrada:.2f}",               # 19. Costo Total entrada
                f"{r.cantidad_salida:.8f}",                   # 20. Cantidad salida
                f"{r.costo_unitario_salida:.8f}",             # 21. Costo Unitario salida
                f"{r.costo_total_salida:.2f}",                # 22. Costo Total salida
                f"{r.cantidad_saldo:.8f}",                    # 23. Cantidad saldo final
                f"{r.costo_unitario_saldo:.8f}",              # 24. Costo Unitario saldo
                f"{r.costo_total_saldo:.2f}",                 # 25. Costo Total saldo
                mov.estado_sunat                              # 26. Estado operación
            ]
            output.write("|".join(linea) + "|\r\n")

        return nombre_archivo, output.getvalue()
```

---

## 5. FRONTEND: DEFINICIONES TYPESCRIPT Y VISTAS CLAVE

### 5.1. Tipos e Interfaces (`frontend/src/types/inventory.ts`)

```typescript
export interface Producto {
  id: string;
  sku: string;
  codigo_barras?: string;
  descripcion: string;
  tipo_existencia: string; // '01', '02', '03'
  unidad_medida: string;   // 'NIU', 'KGM'
  metodo_valuacion: '1' | '2' | '5';
  stock_minimo: number;
  stock_maximo: number;
  control_lotes: boolean;
  control_series: boolean;
  atributos_extra?: Record<string, string | number>;
  activo: boolean;
}

export interface KardexFila {
  id: string;
  periodo_aaaamm: string;
  fecha_operacion: string;
  tipo_operacion: string;
  tipo_comprobante: string;
  serie_numero: string;
  // Entradas
  cantidad_entrada: number;
  costo_unitario_entrada: number;
  costo_total_entrada: number;
  // Salidas
  cantidad_salida: number;
  costo_unitario_salida: number;
  costo_total_salida: number;
  // Saldos
  cantidad_saldo: number;
  costo_unitario_saldo: number;
  costo_total_saldo: number;
}
```

### 5.2. Componente de Kardex Interactivo (`frontend/src/features/kardex/KardexView.tsx`)

```tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Download, FileSpreadsheet } from 'lucide-react';
import { KardexFila } from '../../types/inventory';
import { api } from '../../api/client';

export const KardexView: React.FC<{ productoId: string; almacenId: string }> = ({ productoId, almacenId }) => {
  const [modo, setModo] = useState<'VALORIZADO' | 'FISICO'>('VALORIZADO');

  const { data: kardex = [], isLoading } = useQuery<KardexFila[]>({
    queryKey: ['kardex', productoId, almacenId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/kardex/producto/${productoId}/?almacen=${almacenId}`);
      return res.data;
    }
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Kardex de Inventario Permanente</h2>
          <p className="text-xs text-slate-500">Cumplimiento SUNAT PLE 12.1 y 13.1</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-slate-200 p-1 rounded-lg flex text-xs font-semibold">
            <button
              onClick={() => setModo('VALORIZADO')}
              className={`px-3 py-1 rounded-md transition ${modo === 'VALORIZADO' ? 'bg-white text-navy-800 shadow-sm' : 'text-slate-600'}`}
            >
              Valorizado (13.1)
            </button>
            <button
              onClick={() => setModo('FISICO')}
              className={`px-3 py-1 rounded-md transition ${modo === 'FISICO' ? 'bg-white text-navy-800 shadow-sm' : 'text-slate-600'}`}
            >
              Unidades Físicas (12.1)
            </button>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700">
            <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th rowSpan={2} className="p-2 border-r border-slate-700">Fecha</th>
              <th rowSpan={2} className="p-2 border-r border-slate-700">Operación</th>
              <th rowSpan={2} className="p-2 border-r border-slate-700">Comprobante</th>
              <th colSpan={modo === 'VALORIZADO' ? 3 : 1} className="p-2 text-center bg-blue-900 border-r border-slate-700">ENTRADAS</th>
              <th colSpan={modo === 'VALORIZADO' ? 3 : 1} className="p-2 text-center bg-amber-900 border-r border-slate-700">SALIDAS</th>
              <th colSpan={modo === 'VALORIZADO' ? 3 : 1} className="p-2 text-center bg-emerald-900">SALDO EXISTENCIA</th>
            </tr>
            <tr className="bg-slate-800 text-slate-200 text-[11px]">
              <th className="p-1.5 text-right">Cant.</th>
              {modo === 'VALORIZADO' && <><th className="p-1.5 text-right">C.U.</th><th className="p-1.5 text-right border-r border-slate-700">Total</th></>}
              <th className="p-1.5 text-right">Cant.</th>
              {modo === 'VALORIZADO' && <><th className="p-1.5 text-right">C.U.</th><th className="p-1.5 text-right border-r border-slate-700">Total</th></>}
              <th className="p-1.5 text-right">Cant.</th>
              {modo === 'VALORIZADO' && <><th className="p-1.5 text-right">C.U.</th><th className="p-1.5 text-right">Total</th></>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {kardex.map((fila, idx) => (
              <tr key={fila.id || idx} className="hover:bg-slate-50 transition">
                <td className="p-2 text-slate-600 font-sans">{fila.fecha_operacion}</td>
                <td className="p-2 font-sans"><span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">{fila.tipo_operacion}</span></td>
                <td className="p-2 text-slate-700 font-sans">{fila.serie_numero}</td>
                
                {/* Entradas */}
                <td className="p-2 text-right font-semibold text-blue-700">{fila.cantidad_entrada > 0 ? fila.cantidad_entrada.toFixed(2) : '-'}</td>
                {modo === 'VALORIZADO' && (
                  <>
                    <td className="p-2 text-right text-slate-600">{fila.cantidad_entrada > 0 ? fila.costo_unitario_entrada.toFixed(4) : '-'}</td>
                    <td className="p-2 text-right font-medium border-r border-slate-200">{fila.cantidad_entrada > 0 ? fila.costo_total_entrada.toFixed(2) : '-'}</td>
                  </>
                )}

                {/* Salidas */}
                <td className="p-2 text-right font-semibold text-amber-700">{fila.cantidad_salida > 0 ? fila.cantidad_salida.toFixed(2) : '-'}</td>
                {modo === 'VALORIZADO' && (
                  <>
                    <td className="p-2 text-right text-slate-600">{fila.cantidad_salida > 0 ? fila.costo_unitario_salida.toFixed(4) : '-'}</td>
                    <td className="p-2 text-right font-medium border-r border-slate-200">{fila.cantidad_salida > 0 ? fila.costo_total_salida.toFixed(2) : '-'}</td>
                  </>
                )}

                {/* Saldos */}
                <td className="p-2 text-right font-bold text-slate-900 bg-slate-50">{fila.cantidad_saldo.toFixed(2)}</td>
                {modo === 'VALORIZADO' && (
                  <>
                    <td className="p-2 text-right text-slate-700 bg-slate-50">{fila.costo_unitario_saldo.toFixed(4)}</td>
                    <td className="p-2 text-right font-bold text-emerald-700 bg-slate-50">S/ {fila.costo_total_saldo.toFixed(2)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

---

## 6. GUÍA DE PROMPTS PARA EJECUTAR EN AGENTE IA (CURSOR / CLAUDE CODE)

Para que el asistente de programación desarrolle el código paso a paso sin saturar el contexto, utiliza esta secuencia:

### Prompt 1: Configuración de Base de Datos y Modelos
```text
Por favor, genera la aplicación Django `apps/catalogo` y `apps/inventario` con los modelos especificados en la sección 2 del archivo SPEC_MODULO_ALMACEN_IA.md. Asegúrate de incluir las migraciones correspondientes en PostgreSQL, los validadores de formato de RUC y los campos JSONB de atributos extra.
```

### Prompt 2: Motor de Concurrencia y Movimientos
```text
Implementa el servicio `KardexValuationEngine` y los ViewSets de `MovimientoInventarioViewSet` utilizando transacciones atómicas (`@transaction.atomic`) y bloqueo pesimista (`select_for_update`) sobre el modelo `StockSaldo` tal como se detalla en la sección 3. Añade pruebas unitarias con pytest validando que no se pueda vender stock negativo.
```

### Prompt 3: Generador PLE SUNAT 12.1 y 13.1
```text
Crea el servicio `SunatPleExporter` de la sección 4 de SPEC_MODULO_ALMACEN_IA.md con un endpoint DRF `/api/v1/sunat-ple/descargar/` que reciba `tipo_libro`, `anio` y `mes`, y retorne el archivo .TXT con la máscara oficial de 33 caracteres y codificación UTF-8 / Windows-1252.
```

### Prompt 4: Componentes React + TypeScript + Tailwind
```text
Genera el componente `KardexView.tsx` y el formulario modal de registro de movimientos de almacén utilizando React Hook Form y Zod. Integra la selección de tipos de comprobante de la Tabla 10 SUNAT y tipos de operación de la Tabla 12.
```
