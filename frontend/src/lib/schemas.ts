import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Ingresa tu correo").email("Correo inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const almacenSchema = z.object({
  codigo: z.string().min(1, "El código es obligatorio").max(20),
  codigo_establecimiento: z
    .string()
    .regex(/^\d{4}$/, "Debe tener 4 dígitos"),
  codigo_correlativo: z
    .string()
    .regex(/^\d{0,3}$/, "Hasta 3 dígitos")
    .optional()
    .or(z.literal("")),
  nombre: z.string().min(1, "El nombre es obligatorio").max(100),
  direccion: z.string().min(1, "La dirección es obligatoria").max(250),
  ubigeo: z
    .string()
    .regex(/^\d{0,6}$/, "El ubigeo debe tener 6 dígitos")
    .optional()
    .or(z.literal("")),
  es_almacen_tercero: z.boolean().optional(),
  activo: z.boolean().optional(),
});
export type AlmacenForm = z.infer<typeof almacenSchema>;

export const ubicacionSchema = z.object({
  almacen: z.string().min(1, "Selecciona un almacén"),
  codigo: z.string().min(1, "El código es obligatorio").max(30),
  descripcion: z.string().max(100).optional(),
  capacidad_peso_kg: z.string().optional(),
  capacidad_volumen_m3: z.string().optional(),
  activo: z.boolean().optional(),
});
export type UbicacionForm = z.infer<typeof ubicacionSchema>;

export const categoriaSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(100),
  parent: z.string().optional().nullable(),
  cuenta_contable_inventario: z.string().min(1).max(24),
  cuenta_contable_costo_venta: z.string().min(1).max(24),
  activo: z.boolean().optional(),
});
export type CategoriaForm = z.infer<typeof categoriaSchema>;

export const productoSchema = z
  .object({
    sku: z.string().min(1, "El SKU es obligatorio").max(50),
    codigo_barras: z.string().max(50).optional(),
    descripcion: z.string().min(1, "La descripción es obligatoria").max(250),
    categoria: z.string().optional().nullable(),
    tipo_existencia: z.string().min(1),
    unidad_medida: z.string().min(1),
    catalogo_tipo: z.enum(["1", "3", "9"]),
    codigo_propio_sunat: z.string().min(1, "El código SUNAT es obligatorio").max(24),
    catalogo_internacional: z.enum(["", "1", "3"]).optional(),
    codigo_internacional: z.string().max(128).optional(),
    cubso_osce: z.string().max(16).optional(),
    metodo_valuacion: z.enum(["1", "2", "5"]),
    control_lotes: z.boolean().optional(),
    control_series: z.boolean().optional(),
    stock_minimo: z.string().optional(),
    stock_maximo: z.string().optional(),
    punto_reorden: z.string().optional(),
    activo: z.boolean().optional(),
    atributos_extra: z.record(z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.control_lotes && data.control_series) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["control_series"],
        message: "No se puede controlar lotes y series a la vez.",
      });
    }
    if (Boolean(data.catalogo_internacional) !== Boolean(data.codigo_internacional)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["codigo_internacional"],
        message: "Catálogo y código internacional deben ir juntos.",
      });
    }
  });
export type ProductoForm = z.infer<typeof productoSchema>;

export const loteSchema = z.object({
  producto: z.string().min(1, "Selecciona un producto"),
  numero_lote_serie: z.string().min(1, "El lote o serie es obligatorio").max(50),
  fecha_fabricacion: z.string().optional().nullable(),
  fecha_vencimiento: z.string().optional().nullable(),
  estado: z.enum(["DISPONIBLE", "CUARENTENA", "VENCIDO"]).optional(),
  activo: z.boolean().optional(),
});
export type LoteForm = z.infer<typeof loteSchema>;

export const reservaSchema = z.object({
  almacen: z.string().min(1, "Selecciona un almacén"),
  producto: z.string().min(1, "Selecciona un producto"),
  ubicacion: z.string().optional().nullable(),
  lote_serie: z.string().optional().nullable(),
  cantidad: z
    .string()
    .min(1, "Ingresa la cantidad")
    .refine((value) => Number(value) > 0, "Debe ser mayor a cero"),
  expira_en: z.string().optional().nullable(),
  referencia: z.string().max(100).optional(),
});
export type ReservaForm = z.infer<typeof reservaSchema>;

export const movimientoDetalleSchema = z.object({
  producto: z.string().min(1, "Selecciona un producto"),
  ubicacion: z.string().optional().nullable(),
  ubicacion_destino: z.string().optional().nullable(),
  lote_serie: z.string().optional().nullable(),
  cantidad: z
    .string()
    .min(1, "Ingresa la cantidad")
    .refine((value) => Number(value) > 0, "Debe ser mayor a cero"),
  costo_unitario: z.string().optional(),
});

export const movimientoSchema = z
  .object({
    tipo_movimiento: z.enum(["ENTRADA", "SALIDA", "TRANSFERENCIA", "AJUSTE"]),
    direccion_ajuste: z.enum(["", "ENTRADA", "SALIDA"]).optional(),
    tipo_operacion_sunat: z.string().optional(),
    tipo_comprobante_sunat: z.string().optional(),
    serie_comprobante: z.string().optional(),
    numero_comprobante: z.string().optional(),
    fecha_operacion: z.string().min(1, "Selecciona una fecha"),
    fecha_documento: z.string().optional().nullable(),
    almacen: z.string().min(1, "Selecciona un almacén"),
    almacen_destino: z.string().optional().nullable(),
    glosa: z.string().max(200).optional(),
    detalles: z.array(movimientoDetalleSchema).min(1, "Agrega al menos un detalle"),
  })
  .superRefine((data, ctx) => {
    if (data.tipo_movimiento === "TRANSFERENCIA") {
      if (!data.almacen_destino) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["almacen_destino"],
          message: "Selecciona el almacén destino.",
        });
      } else if (data.almacen_destino === data.almacen) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["almacen_destino"],
          message: "El almacén destino debe ser distinto.",
        });
      }
    }
    if (
      data.tipo_movimiento === "AJUSTE" &&
      !["ENTRADA", "SALIDA"].includes(data.direccion_ajuste ?? "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["direccion_ajuste"],
        message: "Indica si el ajuste es de entrada o salida.",
      });
    }
    const operacion = data.tipo_operacion_sunat ?? "";
    if (["01", "02", "03", "04", "05", "06"].includes(operacion)) {
      if ((data.tipo_comprobante_sunat ?? "00") === "00") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tipo_comprobante_sunat"],
          message: "La operación exige un comprobante distinto de 00.",
        });
      }
      if (
        ["", "0"].includes(data.serie_comprobante ?? "") ||
        ["", "0"].includes(data.numero_comprobante ?? "")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["serie_comprobante"],
          message: "La operación exige serie y número.",
        });
      }
    }
    const requiereCosto =
      data.tipo_movimiento === "ENTRADA" ||
      (data.tipo_movimiento === "AJUSTE" && data.direccion_ajuste === "ENTRADA");
    if (requiereCosto) {
      data.detalles.forEach((detalle, index) => {
        if (!detalle.costo_unitario || Number(detalle.costo_unitario) <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["detalles", index, "costo_unitario"],
            message: "Ingresa el costo unitario de la entrada.",
          });
        }
      });
    }
  });
export type MovimientoForm = z.infer<typeof movimientoSchema>;
export type MovimientoDetalleForm = z.infer<typeof movimientoDetalleSchema>;
