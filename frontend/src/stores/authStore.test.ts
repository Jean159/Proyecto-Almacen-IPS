import { beforeEach, describe, expect, it } from "vitest";

import { useAuthStore } from "@/stores/authStore";

const empresa = {
  id: "empresa-1",
  ruc: "20123456786",
  razon_social: "Demo S.A.C.",
  nombre_comercial: "Demo",
  es_oficial: true,
  moneda_principal: "PEN" as const,
  activo: true,
};

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it("guarda la sesión y limpia al cerrar", () => {
    useAuthStore.getState().setSession({
      access: "access",
      refresh: "refresh",
      usuario: {
        id: "u1",
        email: "demo@example.com",
        first_name: "Demo",
        last_name: "User",
        nombre_completo: "Demo User",
        telefono: "",
        is_active: true,
      },
      empresas: [empresa],
    });
    expect(useAuthStore.getState().accessToken).toBe("access");
    expect(useAuthStore.getState().empresas).toHaveLength(1);

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().usuario).toBeNull();
  });

  it("deriva empresas desde las membresías", () => {
    useAuthStore.getState().setMembresias([
      {
        id: "m1",
        empresa,
        rol: "ADMIN",
        activo: true,
      },
    ]);
    expect(useAuthStore.getState().empresas[0].ruc).toBe("20123456786");
  });
});
