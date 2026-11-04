import {
  Boxes,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  MapPin,
  PackageSearch,
  ScrollText,
  Tags,
  Warehouse,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useRolActual } from "@/hooks/useAuth";
import { can, type Permission } from "@/lib/permissions";
import { cn } from "@/lib/cn";
import { useUIStore } from "@/stores/uiStore";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  permission?: Permission;
}

const groups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Operación",
    items: [
      { label: "Dashboard", to: "/", icon: LayoutDashboard, end: true },
      { label: "Movimientos", to: "/movimientos", icon: ClipboardList },
      { label: "Kardex", to: "/kardex", icon: ScrollText },
      {
        label: "PLE SUNAT",
        to: "/ple",
        icon: FileSpreadsheet,
        permission: "ple:read",
      },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { label: "Productos", to: "/catalogo/productos", icon: PackageSearch },
      { label: "Categorías", to: "/catalogo/categorias", icon: Tags },
      { label: "Lotes y series", to: "/catalogo/lotes", icon: Boxes },
    ],
  },
  {
    label: "Almacén",
    items: [
      { label: "Almacenes", to: "/almacenes", icon: Warehouse },
      { label: "Ubicaciones", to: "/almacenes/ubicaciones", icon: MapPin },
      { label: "Stock", to: "/stock", icon: Boxes },
      { label: "Reservas", to: "/stock/reservas", icon: CalendarClock },
    ],
  },
  {
    label: "Configuración",
    items: [
      {
        label: "Periodos",
        to: "/periodos",
        icon: Building2,
        permission: "period:write",
      },
    ],
  },
];

function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const rol = useRolActual();

  return (
    <div className="flex h-full flex-col bg-navy-950 text-slate-300">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-white/10 px-4",
          collapsed ? "justify-center" : "gap-3",
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/30">
          <Boxes className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-wide text-white">
              ALMACÉN
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              ERP · Inventario
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-5">
        {groups.map((group) => {
          const items = group.items.filter(
            (item) => !item.permission || can(rol, item.permission),
          );
          if (!items.length) return null;
          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center rounded-lg py-2 text-sm font-medium transition",
                          collapsed ? "justify-center px-2" : "gap-3 px-3",
                          isActive
                            ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/20"
                            : "text-slate-400 hover:bg-white/5 hover:text-white",
                        )
                      }
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-white/10 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            Módulo almacén
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Kardex valorizado · PLE 12.1 / 13.1
          </p>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const mobileOpen = useUIStore((state) => state.mobileSidebarOpen);
  const setMobileOpen = useUIStore((state) => state.setMobileSidebarOpen);

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-white/5 transition-all duration-200 lg:block",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <SidebarContent collapsed={collapsed} />
        <button
          type="button"
          onClick={toggleSidebar}
          className="focus-ring absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-slate-900"
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          />
          <aside className="relative h-full w-72 shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  );
}
