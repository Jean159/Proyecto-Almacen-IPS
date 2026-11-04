import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { LogOut, UserRound } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { roleLabels } from "@/lib/permissions";
import { initials } from "@/lib/format";
import { queryClient } from "@/lib/queryClient";
import { useEmpresaStore } from "@/stores/empresaStore";
import { useAuthStore } from "@/stores/authStore";

export function UserMenu() {
  const { logout } = useAuth();
  const usuario = useAuthStore((state) => state.usuario);
  const membresias = useAuthStore((state) => state.membresias);
  const empresa = useEmpresaStore((state) => state.empresa);
  const rol = membresias.find((item) => item.empresa.id === empresa?.id)?.rol;
  const nombre = usuario?.nombre_completo || usuario?.email || "Usuario";

  return (
    <Menu as="div" className="relative">
      <MenuButton className="focus-ring flex items-center gap-2 rounded-full p-0.5 hover:bg-slate-100">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-950 text-xs font-bold text-emerald-300">
          {initials(nombre)}
        </span>
      </MenuButton>
      <MenuItems className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="truncate text-sm font-bold text-slate-900">{nombre}</p>
          <p className="truncate text-xs text-slate-500">{usuario?.email}</p>
          {rol && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              {roleLabels[rol]}
            </p>
          )}
        </div>
        <MenuItem>
          {({ focus }) => (
            <button
              type="button"
              className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                focus ? "bg-slate-50" : ""
              } text-slate-600`}
              onClick={() => {
                useEmpresaStore.getState().clear();
                queryClient.clear();
                window.location.assign("/seleccionar-empresa");
              }}
            >
              <UserRound className="h-4 w-4" />
              Cambiar empresa
            </button>
          )}
        </MenuItem>
        <MenuItem>
          {({ focus }) => (
            <button
              type="button"
              className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                focus ? "bg-rose-50" : ""
              } text-rose-600`}
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          )}
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
