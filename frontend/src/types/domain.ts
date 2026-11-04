export type UUID = string;
export type DecimalString = string;
export type Rol = "ADMIN" | "JEFE" | "OPERADOR" | "CONSULTA" | "AUDITOR";

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Empresa {
  id: UUID;
  ruc: string;
  razon_social: string;
  nombre_comercial: string;
  es_oficial: boolean;
  moneda_principal: "PEN" | "USD";
  activo: boolean;
}

export interface Usuario {
  id: UUID;
  email: string;
  first_name: string;
  last_name: string;
  nombre_completo: string;
  telefono: string;
  is_active: boolean;
}

export interface UsuarioEmpresa {
  id: UUID;
  empresa: Empresa;
  rol: Rol;
  activo: boolean;
}

export interface Me extends Usuario {
  empresas: UsuarioEmpresa[];
}

export interface LoginResponse {
  access: string;
  refresh: string;
  usuario: Usuario;
  empresas: Empresa[];
}

export interface MeResponse extends Usuario {
  empresas: UsuarioEmpresa[];
}

export interface Almacen {
  id: UUID;
  codigo: string;
  codigo_establecimiento: string;
  codigo_correlativo: string | null;
  codigo_sunat: string;
  nombre: string;
  direccion: string;
  ubigeo: string;
  es_almacen_tercero: boolean;
  activo: boolean;
  ubicaciones_count?: number;
}

export interface Ubicacion {
  id: UUID;
  almacen: UUID;
  almacen_nombre: string;
  almacen_codigo: string;
  codigo: string;
  descripcion: string;
  capacidad_peso_kg: DecimalString | null;
  capacidad_volumen_m3: DecimalString | null;
  activo: boolean;
}

export interface CategoriaProducto {
  id: UUID;
  nombre: string;
  parent: UUID | null;
  parent_nombre?: string | null;
  cuenta_contable_inventario: string;
  cuenta_contable_costo_venta: string;
  activo: boolean;
}

export interface Producto {
  id: UUID;
  sku: string;
  codigo_barras: string;
  descripcion: string;
  categoria: UUID | null;
  categoria_nombre?: string | null;
  tipo_existencia: string;
  tipo_existencia_display?: string;
  unidad_medida: string;
  unidad_medida_display?: string;
  catalogo_tipo: "1" | "3" | "9";
  codigo_propio_sunat: string;
  catalogo_internacional: "1" | "3" | "" | null;
  codigo_internacional: string;
  cubso_osce: string;
  metodo_valuacion: "1" | "2" | "5";
  metodo_valuacion_display?: string;
  control_lotes: boolean;
  control_series: boolean;
  stock_minimo: DecimalString;
  stock_maximo: DecimalString;
  punto_reorden: DecimalString;
  atributos_extra: Record<string, unknown>;
  activo: boolean;
}

export interface LoteSerie {
  id: UUID;
  producto: UUID;
  producto_sku?: string;
  producto_descripcion?: string;
  numero_lote_serie: string;
  fecha_fabricacion: string | null;
  fecha_vencimiento: string | null;
  estado: "DISPONIBLE" | "CUARENTENA" | "VENCIDO";
  activo: boolean;
}

export interface StockSaldo {
  id: UUID;
  almacen: UUID;
  almacen_codigo: string;
  almacen_nombre: string;
  producto: UUID;
  producto_sku: string;
  producto_descripcion: string;
  ubicacion: UUID | null;
  ubicacion_codigo: string | null;
  lote_serie: UUID | null;
  lote_numero: string | null;
  lote_fecha_vencimiento: string | null;
  cantidad_fisica: DecimalString;
  cantidad_reservada: DecimalString;
  cantidad_disponible: DecimalString;
  bajo_minimo: boolean;
  ultima_actualizacion: string;
}

export interface StockResumen {
  almacen_id: UUID;
  producto_id: UUID;
  cantidad_fisica: DecimalString;
  cantidad_reservada: DecimalString;
  cantidad_disponible: DecimalString;
  costo_total: DecimalString;
}

export interface ReservaStock {
  id: UUID;
  almacen: UUID;
  almacen_nombre: string;
  producto: UUID;
  producto_sku: string;
  ubicacion: UUID | null;
  lote_serie: UUID | null;
  cantidad: DecimalString;
  estado: "ACTIVA" | "LIBERADA" | "CONSUMIDA" | "VENCIDA";
  expira_en: string | null;
  referencia: string;
  creado_por: UUID | null;
  creado_en: string;
}

export interface MovimientoDetalle {
  id: UUID;
  producto: UUID;
  producto_sku: string;
  producto_descripcion: string;
  ubicacion: UUID | null;
  ubicacion_codigo: string | null;
  ubicacion_destino: UUID | null;
  ubicacion_destino_codigo: string | null;
  lote_serie: UUID | null;
  lote_numero: string | null;
  cantidad: DecimalString;
  costo_unitario: DecimalString;
  costo_total: DecimalString;
}

export interface Movimiento {
  id: UUID;
  correlativo_interno: string;
  tipo_movimiento: "ENTRADA" | "SALIDA" | "TRANSFERENCIA" | "AJUSTE";
  tipo_movimiento_display: string;
  direccion_ajuste: "" | "ENTRADA" | "SALIDA";
  tipo_operacion_sunat: string;
  tipo_operacion_display: string;
  tipo_comprobante_sunat: string;
  tipo_comprobante_display: string;
  serie_comprobante: string;
  numero_comprobante: string;
  fecha_operacion: string;
  fecha_documento: string | null;
  almacen: UUID;
  almacen_nombre: string;
  almacen_destino: UUID | null;
  almacen_destino_nombre: string | null;
  cuo_contable: string;
  correlativo_asiento: string;
  estado_sunat: string;
  glosa: string;
  estado: "BORRADOR" | "CONFIRMADO" | "ANULADO";
  estado_display: string;
  idempotency_key: string;
  external_id: string;
  movimiento_reverso_de: UUID | null;
  detalles: MovimientoDetalle[];
  creado_en: string;
  confirmado_en: string | null;
}

export interface MovimientoListItem {
  id: UUID;
  correlativo_interno: string;
  tipo_movimiento: "ENTRADA" | "SALIDA" | "TRANSFERENCIA" | "AJUSTE";
  tipo_movimiento_display: string;
  fecha_operacion: string;
  almacen: UUID;
  almacen_nombre: string;
  almacen_destino: UUID | null;
  tipo_operacion_sunat: string;
  tipo_comprobante_sunat: string;
  serie_comprobante: string;
  numero_comprobante: string;
  glosa: string;
  estado: "BORRADOR" | "CONFIRMADO" | "ANULADO";
  estado_display: string;
  creado_en: string;
}

export interface EventoMovimiento {
  id: UUID;
  accion: string;
  usuario_email: string | null;
  detalle: Record<string, unknown>;
  creado_en: string;
}

export interface MovimientoDetallePayload {
  producto: string;
  ubicacion?: string | null;
  ubicacion_destino?: string | null;
  lote_serie?: string | null;
  cantidad: string;
  costo_unitario?: string;
  costo_total?: string;
}

export interface MovimientoPayload {
  tipo_movimiento: "ENTRADA" | "SALIDA" | "TRANSFERENCIA" | "AJUSTE";
  direccion_ajuste?: "" | "ENTRADA" | "SALIDA";
  tipo_operacion_sunat?: string;
  tipo_comprobante_sunat?: string;
  serie_comprobante?: string;
  numero_comprobante?: string;
  fecha_operacion: string;
  fecha_documento?: string | null;
  almacen: string;
  almacen_destino?: string | null;
  glosa?: string;
  estado_sunat?: string;
  detalles: MovimientoDetallePayload[];
}

export interface KardexFila {
  id: UUID;
  periodo_aaaamm: string;
  fecha_operacion: string;
  tipo_operacion: string;
  tipo_comprobante: string;
  serie_comprobante: string;
  numero_comprobante: string;
  serie_numero: string;
  cuo_contable: string;
  producto: UUID;
  producto_sku: string;
  producto_descripcion: string;
  almacen: UUID;
  almacen_codigo: string;
  almacen_nombre: string;
  metodo_valuacion: string;
  metodo_valuacion_display: string;
  cantidad_entrada: DecimalString;
  costo_unitario_entrada: DecimalString;
  costo_total_entrada: DecimalString;
  cantidad_salida: DecimalString;
  costo_unitario_salida: DecimalString;
  costo_total_salida: DecimalString;
  cantidad_saldo: DecimalString;
  costo_unitario_saldo: DecimalString;
  costo_total_saldo: DecimalString;
  estado_sunat: string;
}

export interface KardexFisico {
  id: UUID;
  periodo_aaaamm: string;
  fecha_operacion: string;
  tipo_operacion: string;
  tipo_comprobante: string;
  serie_comprobante: string;
  numero_comprobante: string;
  serie_numero: string;
  producto: UUID;
  producto_sku: string;
  producto_descripcion: string;
  almacen: UUID;
  almacen_codigo: string;
  cantidad_entrada: DecimalString;
  cantidad_salida: DecimalString;
  cantidad_saldo: DecimalString;
  estado_sunat: string;
}

export interface SaldoKardex {
  id: UUID;
  almacen: UUID;
  almacen_codigo: string;
  almacen_nombre: string;
  producto: UUID;
  producto_sku: string;
  producto_descripcion: string;
  cantidad: DecimalString;
  costo_unitario: DecimalString;
  costo_total: DecimalString;
  ultima_secuencia: number;
  actualizado_en: string;
}

export interface SunatTabla {
  id: UUID;
  tabla_numero: number;
  codigo: string;
  descripcion: string;
  activo: boolean;
  vigente_desde: string | null;
  vigente_hasta: string | null;
}

export interface DashboardKpis {
  valor_inventario: DecimalString;
  unidades_stock: DecimalString;
  productos_bajo_minimo: number;
  lotes_por_vencer_30d: number;
  movimientos_mes: number;
  exportaciones_ple_mes: number;
  ultimos_movimientos: MovimientoListItem[];
  stock_por_almacen: Array<{
    almacen__codigo: string;
    almacen__nombre: string;
    cantidad: DecimalString;
    valor: DecimalString;
  }>;
}

export interface PleError {
  linea: number;
  campo: string;
  mensaje: string;
}

export interface PlePreview {
  libro: "12.1" | "13.1";
  periodo: string;
  nombre_archivo: string;
  cantidad_registros: number;
  lineas: string[];
  total_lineas: number;
  errores: PleError[];
}

export interface ExportacionPle {
  id: UUID;
  libro: "12.1" | "13.1";
  anio: number;
  mes: number;
  nombre_archivo: string;
  hash_sha256: string;
  cantidad_registros: number;
  errores: PleError[];
  usuario_email: string | null;
  creado_en: string;
}

export interface CierrePeriodo {
  id: UUID;
  anio: number;
  mes: number;
  estado: "ABIERTO" | "CERRADO";
  cerrado_por: UUID | null;
  cerrado_en: string | null;
  creado_en: string;
}

export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  [key: string]: string | number | boolean | undefined | null;
}
