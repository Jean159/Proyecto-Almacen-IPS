import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Building2, Check, ChevronDown } from "lucide-react";

import { queryClient } from "@/lib/queryClient";
import { roleLabels } from "@/lib/permissions";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/authStore";
import { useEmpresaStore } from "@/stores/empresaStore";

export function EmpresaSwitcher() {
  const empresa = useEmpresaStore((state) => state.empresa);
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa);
  const membresias = useAuthStore((state) => state.membresias);
  const empresas = useAuthStore((state) => state.empresas);

  const opciones = membresias.length
    ? membresias.map((membresia) => ({
        empresa: membresia.empresa,
        rol: membresia.rol,
      }))
    : empresas.map((item) => ({ empresa: item, rol: null }));

  if (!opciones.length) return null;

  if (opciones.length === 1) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
        <Building2 className="h-4 w-4 text-slate-400" />
        <div className="min-w-0">
          <p className="max-w-[180px] truncate text-xs font-semibold text-slate-800">
            {opciones[0].empresa.nombre_comercial || opciones[0].empresa.razon_social}
          </p>
          <p className="text-[10px] text-slate-500">{opciones[0].empresa.ruc}</p>
        </div>
      </div>
    );
  }

  return (
    <Menu as="div" className="relative">
      <MenuButton className="focus-ring flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left hover:bg-slate-50">
        <Building2 className="h-4 w-4 text-slate-400" />
        <div className="min-w-0">
          <p className="max-w-[170px] truncate text-xs font-semibold text-slate-800">
            {empresa?.nombre_comercial || empresa?.razon_social || "Seleccionar empresa"}
          </p>
          <p className="text-[10px] text-slate-500">{empresa?.ruc}</p>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </MenuButton>
      <MenuItems className="absolute right-0 z-40 mt-1 w-72 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Empresas disponibles
        </p>
        {opciones.map(({ empresa: item, rol }) => (
          <MenuItem key={item.id}>
            {({ focus }) => (
              <button
                type="button"
                onClick={() => {
                  if (item.id !== empresa?.id) {
                    setEmpresa(item);
                    queryClient.clear();
                  }
                }}
                className={cn(
                  "flex w-full items-start gap-3 px-3 py-2.5 text-left",
                  focus && "bg-slate-50",
                )}
              >
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-slate-800">
                    {item.nombre_comercial || item.razon_social}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {item.ruc} {rol ? `· ${roleLabels[rol]}` : ""}
                  </span>
                </span>
                {item.id === empresa?.id && (
                  <Check className="mt-1 h-4 w-4 text-emerald-600" />
                )}
              </button>
            )}
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
