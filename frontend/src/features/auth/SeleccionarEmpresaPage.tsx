import { ArrowRight, Building2, LogOut } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { roleLabels } from "@/lib/permissions";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { useEmpresaStore } from "@/stores/empresaStore";

export function SeleccionarEmpresaPage() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const membresias = useAuthStore((state) => state.membresias);
  const empresas = useAuthStore((state) => state.empresas);
  const logout = useAuthStore((state) => state.logout);
  const empresaActiva = useEmpresaStore((state) => state.empresa);
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa);

  if (!accessToken) return <Navigate to="/login" replace />;
  if (empresaActiva) return <Navigate to="/" replace />;

  const opciones = membresias.length
    ? membresias.map((membresia) => ({
        empresa: membresia.empresa,
        rol: membresia.rol,
      }))
    : empresas.map((empresa) => ({ empresa, rol: null }));

  function seleccionar(empresa: (typeof opciones)[number]["empresa"]) {
    setEmpresa(empresa);
    queryClient.clear();
    navigate("/", { replace: true });
  }

  function cerrarSesion() {
    logout();
    queryClient.clear();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-950 text-emerald-400">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            Selecciona una empresa
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tu usuario tiene acceso a más de una empresa. Elige con cuál vas a
            trabajar.
          </p>
        </div>

        <div className="space-y-3">
          {opciones.map(({ empresa, rol }) => (
            <button
              key={empresa.id}
              type="button"
              onClick={() => seleccionar(empresa)}
              className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-soft"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-700">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">
                  {empresa.nombre_comercial || empresa.razon_social}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {empresa.ruc}
                  {rol ? ` · ${roleLabels[rol]}` : ""}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
            </button>
          ))}
        </div>

        {!opciones.length && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            Tu usuario no tiene empresas activas. Contacta al administrador del
            sistema.
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Button variant="ghost" onClick={cerrarSesion}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
