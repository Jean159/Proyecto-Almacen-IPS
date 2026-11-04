import { Menu, Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { EmpresaSwitcher } from "@/components/layout/EmpresaSwitcher";
import { UserMenu } from "@/components/layout/UserMenu";
import { useUIStore } from "@/stores/uiStore";

export function Topbar() {
  const setMobileOpen = useUIStore((state) => state.setMobileSidebarOpen);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="focus-ring rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Módulo almacén
            </p>
            <p className="text-sm font-semibold text-slate-800">
              Inventario permanente y kardex
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/movimientos/nuevo"
            className="focus-ring hidden h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 sm:flex"
          >
            <Plus className="h-4 w-4" />
            Nuevo movimiento
          </Link>
          <EmpresaSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
