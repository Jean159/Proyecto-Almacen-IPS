import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type Tone =
  | "slate"
  | "emerald"
  | "amber"
  | "rose"
  | "sky"
  | "violet"
  | "navy";

const tones: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  navy: "bg-navy-100 text-navy-800 ring-navy-200",
};

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const estadoTone: Record<string, Tone> = {
  BORRADOR: "amber",
  CONFIRMADO: "emerald",
  ANULADO: "rose",
  ACTIVA: "sky",
  LIBERADA: "slate",
  CONSUMIDA: "violet",
  VENCIDA: "rose",
  ABIERTO: "emerald",
  CERRADO: "slate",
  DISPONIBLE: "emerald",
  CUARENTENA: "amber",
  ENTRADA: "emerald",
  SALIDA: "rose",
  TRANSFERENCIA: "sky",
  AJUSTE: "violet",
};

export function StatusBadge({ value }: { value: string }) {
  return <Badge tone={estadoTone[value] ?? "slate"}>{value}</Badge>;
}
