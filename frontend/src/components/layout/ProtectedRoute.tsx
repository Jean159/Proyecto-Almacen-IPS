import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { SplashScreen } from "@/components/layout/SplashScreen";
import { useAuthStore } from "@/stores/authStore";
import { useEmpresaStore } from "@/stores/empresaStore";

export function ProtectedRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const empresas = useAuthStore((state) => state.empresas);
  const membresias = useAuthStore((state) => state.membresias);
  const empresa = useEmpresaStore((state) => state.empresa);
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa);

  const disponibles = membresias.length
    ? membresias.map((membresia) => membresia.empresa)
    : empresas;

  useEffect(() => {
    if (accessToken && !empresa && disponibles.length === 1) {
      setEmpresa(disponibles[0]);
    }
  }, [accessToken, empresa, disponibles, setEmpresa]);

  if (!accessToken) return <Navigate to="/login" replace />;
  if (!empresa && disponibles.length === 1) return <SplashScreen />;
  if (!empresa) return <Navigate to="/seleccionar-empresa" replace />;
  return <Outlet />;
}
