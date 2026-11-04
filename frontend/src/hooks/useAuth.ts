import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { authApi } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { useEmpresaStore } from "@/stores/empresaStore";
import type { MeResponse, Rol, Usuario } from "@/types/domain";

export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    accessToken,
    refreshToken,
    usuario,
    empresas,
    membresias,
    setSession,
    setUsuario,
    setMembresias,
    logout: clearAuth,
  } = useAuthStore();
  const { empresa, setEmpresa, clear: clearEmpresa } = useEmpresaStore();

  const rol: Rol | null =
    membresias.find((membresia) => membresia.empresa.id === empresa?.id)?.rol ??
    null;

  async function hydrateSession(me: MeResponse) {
    const { empresas: membresiasApi, ...user } = me;
    setUsuario(user as Usuario);
    setMembresias(membresiasApi);
    return membresiasApi;
  }

  async function login(email: string, password: string) {
    const session = await authApi.login(email, password);
    clearEmpresa();
    queryClient.clear();
    setSession(session);
    try {
      const me = await authApi.me();
      const lista = await hydrateSession(me);
      if (lista.length === 1) {
        setEmpresa(lista[0].empresa);
        navigate("/", { replace: true });
      } else {
        navigate("/seleccionar-empresa", { replace: true });
      }
    } catch {
      if (session.empresas.length === 1) {
        setEmpresa(session.empresas[0]);
        navigate("/", { replace: true });
      } else {
        navigate("/seleccionar-empresa", { replace: true });
      }
    }
  }

  function logout() {
    clearAuth();
    clearEmpresa();
    queryClient.clear();
    navigate("/login", { replace: true });
  }

  function cambiarEmpresa(empresaId: string) {
    const membresia = membresias.find((item) => item.empresa.id === empresaId);
    const nuevaEmpresa =
      membresia?.empresa ?? empresas.find((item) => item.id === empresaId) ?? null;
    if (!nuevaEmpresa) return;
    setEmpresa(nuevaEmpresa);
    queryClient.clear();
  }

  return {
    accessToken,
    refreshToken,
    usuario,
    empresas,
    membresias,
    empresa,
    rol,
    login,
    logout,
    hydrateSession,
    cambiarEmpresa,
  };
}

export function useRolActual(): Rol | null {
  const empresa = useEmpresaStore((state) => state.empresa);
  const membresias = useAuthStore((state) => state.membresias);
  return (
    membresias.find((membresia) => membresia.empresa.id === empresa?.id)?.rol ??
    null
  );
}
