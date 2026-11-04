import { describe, expect, it } from "vitest";

import { movimientoSchema, productoSchema } from "@/lib/schemas";

const baseMovimiento = {
  tipo_movimiento: "ENTRADA" as const,
  direccion_ajuste: "" as const,
  tipo_operacion_sunat: "02",
  tipo_comprobante_sunat: "01",
  serie_comprobante: "F001",
  numero_comprobante: "00000001",
  fecha_operacion: "2026-11-03",
  fecha_documento: "",
  almacen: "almacen-1",
  almacen_destino: "",
  glosa: "",
  detalles: [
    {
      producto: "producto-1",
      ubicacion: "",
      ubicacion_destino: "",
      lote_serie: "",
      cantidad: "2",
      costo_unitario: "10",
    },
  ],
};

describe("validación de movimientos", () => {
  it("acepta una entrada completa", () => {
    expect(movimientoSchema.safeParse(baseMovimiento).success).toBe(true);
  });

  it("exige almacén destino distinto en transferencias", () => {
    const result = movimientoSchema.safeParse({
      ...baseMovimiento,
      tipo_movimiento: "TRANSFERENCIA",
      tipo_operacion_sunat: "11",
      tipo_comprobante_sunat: "00",
      serie_comprobante: "0",
      numero_comprobante: "0",
      almacen_destino: "",
      detalles: [
        {
          producto: "producto-1",
          cantidad: "1",
          costo_unitario: "",
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("almacen_destino"))).toBe(true);
    }
  });

  it("exige costo unitario en entradas", () => {
    const result = movimientoSchema.safeParse({
      ...baseMovimiento,
      detalles: [
        {
          producto: "producto-1",
          cantidad: "1",
          costo_unitario: "",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("exige comprobante para operaciones de compra o venta", () => {
    const result = movimientoSchema.safeParse({
      ...baseMovimiento,
      tipo_comprobante_sunat: "00",
    });
    expect(result.success).toBe(false);
  });
});

describe("validación de productos", () => {
  it("rechaza control simultáneo de lotes y series", () => {
    const result = productoSchema.safeParse({
      sku: "SKU-1",
      descripcion: "Producto",
      tipo_existencia: "01",
      unidad_medida: "NIU",
      catalogo_tipo: "9",
      codigo_propio_sunat: "P1",
      metodo_valuacion: "1",
      control_lotes: true,
      control_series: true,
    });
    expect(result.success).toBe(false);
  });

  it("acepta un producto promedio ponderado", () => {
    const result = productoSchema.safeParse({
      sku: "SKU-1",
      descripcion: "Producto",
      tipo_existencia: "01",
      unidad_medida: "NIU",
      catalogo_tipo: "9",
      codigo_propio_sunat: "P1",
      metodo_valuacion: "1",
      control_lotes: false,
      control_series: false,
    });
    expect(result.success).toBe(true);
  });
});
