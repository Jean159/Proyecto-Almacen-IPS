import { useEffect, useState, type ReactNode } from "react";

import { authApi } from "@/api/auth";
import { SplashScreen } from "@/components/layout/SplashScreen";
import { useAuthStore } from "@/stores/authStore";
import { useEmpresaStore } from "@/stores/empresaStore";
import type { Usuario } from "@/types/domain";

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUsuario = useAuthStore((state) => state.setUsuario);
  const setMembresias = useAuthStore((state) => state.setMembresias);
  const logout = useAuthStore((state) => state.logout);
  const empresa = useEmpresaStore((state) => state.empresa);
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa);
  const [loading, setLoading] = useState(Boolean(accessToken));

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    authApi
      .me()
      .then((me) => {
        if (!active) return;
        const { empresas, ...user } = me;
        setUsuario(user as Usuario);
        setMembresias(empresas);
        if (!empresa && empresas.length === 1) {
          setEmpresa(empresas[0].empresa);
        }
      })
      .catch(() => {
        if (active) logout();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // El bootstrap solo debe ejecutarse al cambiar la sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  if (loading) return <SplashScreen message="Validando tu sesión…" />;
  return <>{children}</>;
}
