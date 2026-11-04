import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
  Empresa,
  LoginResponse,
  Usuario,
  UsuarioEmpresa,
} from "@/types/domain";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  usuario: Usuario | null;
  empresas: Empresa[];
  membresias: UsuarioEmpresa[];
  setSession: (session: LoginResponse) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setUsuario: (usuario: Usuario | null) => void;
  setEmpresas: (empresas: Empresa[]) => void;
  setMembresias: (membresias: UsuarioEmpresa[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      usuario: null,
      empresas: [],
      membresias: [],
      setSession: (session) =>
        set({
          accessToken: session.access,
          refreshToken: session.refresh,
          usuario: session.usuario,
          empresas: session.empresas,
          membresias: [],
        }),
      setTokens: (accessToken, refreshToken) =>
        set((state) => ({
          accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
        })),
      setUsuario: (usuario) => set({ usuario }),
      setEmpresas: (empresas) => set({ empresas }),
      setMembresias: (membresias) =>
        set({
          membresias,
          empresas: membresias.map((membresia) => membresia.empresa),
        }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          usuario: null,
          empresas: [],
          membresias: [],
        }),
    }),
    {
      name: "erp-almacen-auth",
      storage: createJSONStorage(() => window.localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        usuario: state.usuario,
        empresas: state.empresas,
        membresias: state.membresias,
      }),
    },
  ),
);
