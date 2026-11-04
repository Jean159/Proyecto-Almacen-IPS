export const queryKeys = {
  me: ["me"] as const,
  empresas: ["empresas"] as const,
  dashboard: (empresaId?: string) => ["dashboard", empresaId] as const,
  almacenes: (empresaId?: string, params?: unknown) =>
    ["almacenes", empresaId, params] as const,
  ubicaciones: (empresaId?: string, params?: unknown) =>
    ["ubicaciones", empresaId, params] as const,
  categorias: (empresaId?: string, params?: unknown) =>
    ["categorias", empresaId, params] as const,
  productos: (empresaId?: string, params?: unknown) =>
    ["productos", empresaId, params] as const,
  producto: (id?: string) => ["producto", id] as const,
  lotes: (empresaId?: string, params?: unknown) =>
    ["lotes", empresaId, params] as const,
  stock: (empresaId?: string, params?: unknown) =>
    ["stock", empresaId, params] as const,
  stockAlertas: (empresaId?: string) => ["stock-alertas", empresaId] as const,
  reservas: (empresaId?: string, params?: unknown) =>
    ["reservas", empresaId, params] as const,
  saldosKardex: (empresaId?: string, params?: unknown) =>
    ["saldos-kardex", empresaId, params] as const,
  movimientos: (empresaId?: string, params?: unknown) =>
    ["movimientos", empresaId, params] as const,
  movimiento: (id?: string) => ["movimiento", id] as const,
  eventos: (id?: string) => ["movimiento-eventos", id] as const,
  kardex: (empresaId?: string, params?: unknown) =>
    ["kardex", empresaId, params] as const,
  kardexFisico: (empresaId?: string, params?: unknown) =>
    ["kardex-fisico", empresaId, params] as const,
  plePreview: (empresaId?: string, params?: unknown) =>
    ["ple-preview", empresaId, params] as const,
  pleHistorial: (empresaId?: string) => ["ple-historial", empresaId] as const,
  sunat: (tabla: number) => ["sunat", tabla] as const,
  periodos: (empresaId?: string, params?: unknown) =>
    ["periodos", empresaId, params] as const,
};
