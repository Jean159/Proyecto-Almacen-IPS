import { Outlet, useLocation } from "react-router-dom";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { cn } from "@/lib/cn";
import { useUIStore } from "@/stores/uiStore";

export function AppShell() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-20" : "lg:pl-64",
        )}
      >
        <Topbar />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
