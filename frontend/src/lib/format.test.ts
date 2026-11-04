import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatMoney,
  formatQuantity,
  toNumber,
} from "@/lib/format";

describe("formato", () => {
  it("convierte decimales serializados como string", () => {
    expect(toNumber("10.5000")).toBe(10.5);
    expect(toNumber(null)).toBe(0);
    expect(toNumber("no-numero")).toBe(0);
  });

  it("formatea moneda peruana", () => {
    expect(formatMoney("1234.5")).toContain("1,234.50");
  });

  it("formatea cantidades con decimales fijos", () => {
    expect(formatQuantity("3", 4)).toBe("3.0000");
  });

  it("formatea fechas sin desfase de zona horaria", () => {
    expect(formatDate("2026-11-03")).toBe("03/11/2026");
    expect(formatDate(null)).toBe("—");
  });
});
