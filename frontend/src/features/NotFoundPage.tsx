import { Compass } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Compass className="h-7 w-7" />
      </div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
        Error 404
      </p>
      <h1 className="mt-1 text-2xl font-black text-slate-950">Página no encontrada</h1>
      <p className="mt-1 text-sm text-slate-500">
        La ruta que buscas no existe o fue movida.
      </p>
      <Link to="/" className="mt-5">
        <Button>Volver al dashboard</Button>
      </Link>
    </div>
  );
}
