import { Boxes } from "lucide-react";

export function SplashScreen({ message = "Cargando tu espacio de trabajo…" }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-950 text-emerald-400 shadow-xl shadow-navy-950/20">
          <Boxes className="h-7 w-7" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Almacén ERP</p>
          <p className="mt-1 text-xs text-slate-500">{message}</p>
        </div>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
        </div>
      </div>
    </div>
  );
}
