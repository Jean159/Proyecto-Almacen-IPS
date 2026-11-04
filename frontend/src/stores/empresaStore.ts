import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Empresa } from "@/types/domain";

interface EmpresaState {
  empresa: Empresa | null;
  setEmpresa: (empresa: Empresa | null) => void;
  clear: () => void;
}

export const useEmpresaStore = create<EmpresaState>()(
  persist(
    (set) => ({
      empresa: null,
      setEmpresa: (empresa) => set({ empresa }),
      clear: () => set({ empresa: null }),
    }),
    {
      name: "erp-almacen-empresa",
      storage: createJSONStorage(() => window.localStorage),
    },
  ),
);
