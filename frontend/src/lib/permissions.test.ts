import { describe, expect, it } from "vitest";

import { can } from "@/lib/permissions";

describe("permisos por rol", () => {
  it("permite anular solo a administradores y jefes", () => {
    expect(can("ADMIN", "movement:annul")).toBe(true);
    expect(can("JEFE", "movement:annul")).toBe(true);
    expect(can("OPERADOR", "movement:annul")).toBe(false);
    expect(can("CONSULTA", "movement:annul")).toBe(false);
  });

  it("permite confirmar a operadores", () => {
    expect(can("OPERADOR", "movement:confirm")).toBe(true);
    expect(can("AUDITOR", "movement:confirm")).toBe(false);
  });

  it("permite PLE a auditores", () => {
    expect(can("AUDITOR", "ple:read")).toBe(true);
    expect(can("CONSULTA", "ple:read")).toBe(false);
  });
});
