import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  FileSpreadsheet,
  PackageSearch,
  Plus,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { dashboardApi } from "@/api/dashboard";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { RoleGate } from "@/components/layout/RoleGate";
import { useRolActual } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatMoney, formatQuantity, toNumber } from "@/lib/format";
import { can } from "@/lib/permissions";
import { queryKeys } from "@/lib/queryKeys";
import { useEmpresaStore } from "@/stores/empresaStore";

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "emerald",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "emerald" | "amber" | "sky" | "violet" | "rose";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
    violet: "bg-violet-50 text-violet-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const empresa = useEmpresaStore((state) => state.empresa);
  const rol = useRolActual();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.dashboard(empresa?.id),
    queryFn: dashboardApi.kpis,
    enabled: Boolean(empresa),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <EmptyState
          icon={AlertTriangle}
          title="No se pudo cargar el dashboard"
          description={errorMessage(error)}
          action={
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          }
        />
      </Card>
    );
  }

  const maxWarehouseValue = Math.max(
    ...data.stock_por_almacen.map((item) => toNumber(item.valor)),
    1,
  );

  return (
    <div>
      <PageHeader
        eyebrow="Panel de control"
        title={`Hola, ${empresa?.nombre_comercial || "bienvenido"}`}
        description="Resumen del inventario, alertas y actividad reciente de tu empresa."
        actions={
          <>
            <RoleGate permission="movement:write">
              <Link to="/movimientos/nuevo">
                <Button leftIcon={<Plus className="h-4 w-4" />}>
                  Nuevo movimiento
                </Button>
              </Link>
            </RoleGate>
            <Link to="/kardex">
              <Button variant="outline" leftIcon={<FileSpreadsheet className="h-4 w-4" />}>
                Ver kardex
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          icon={Boxes}
          label="Valor de inventario"
          value={formatMoney(data.valor_inventario)}
          hint="Costo total según kardex"
        />
        <KpiCard
          icon={Warehouse}
          label="Unidades en stock"
          value={formatQuantity(data.unidades_stock, 0)}
          hint="Suma de saldos por almacén"
          tone="sky"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Productos bajo mínimo"
          value={String(data.productos_bajo_minimo)}
          hint="Requieren reposición"
          tone="amber"
        />
        <KpiCard
          icon={PackageSearch}
          label="Lotes por vencer"
          value={String(data.lotes_por_vencer_30d)}
          hint="Próximos 30 días"
          tone="rose"
        />
        <KpiCard
          icon={ClipboardList}
          label="Movimientos del mes"
          value={String(data.movimientos_mes)}
          hint="Entradas, salidas y transferencias"
          tone="violet"
        />
        <KpiCard
          icon={FileSpreadsheet}
          label="Exportaciones PLE"
          value={String(data.exportaciones_ple_mes)}
          hint="Archivos generados este mes"
          tone="emerald"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Stock por almacén</CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Valorizado al costo actual
              </p>
            </div>
            <Link
              to="/stock"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Ver stock
            </Link>
          </CardHeader>
          <CardContent className="space-y-5">
            {data.stock_por_almacen.length === 0 ? (
              <EmptyState
                icon={Warehouse}
                title="Todavía no hay stock"
                description="Registra una entrada para empezar a valorizar tu inventario."
              />
            ) : (
              data.stock_por_almacen.map((item) => (
                <div key={item.almacen__codigo}>
                  <div className="mb-1.5 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {item.almacen__nombre}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {item.almacen__codigo} · {formatQuantity(item.cantidad, 0)} unidades
                      </p>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-slate-900">
                      {formatMoney(item.valor)}
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      style={{
                        width: `${Math.max(
                          (toNumber(item.valor) / maxWarehouseValue) * 100,
                          3,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Actividad reciente</CardTitle>
              <p className="mt-1 text-xs text-slate-500">Últimos movimientos</p>
            </div>
            <Link
              to="/movimientos"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Ver todos
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.ultimos_movimientos.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Sin movimientos"
                description="Crea el primer movimiento de almacén."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {data.ultimos_movimientos.map((movimiento) => (
                  <Link
                    key={movimiento.id}
                    to={`/movimientos/${movimiento.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50"
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        movimiento.tipo_movimiento === "ENTRADA"
                          ? "bg-emerald-50 text-emerald-700"
                          : movimiento.tipo_movimiento === "SALIDA"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-sky-50 text-sky-700"
                      }`}
                    >
                      {movimiento.tipo_movimiento === "ENTRADA" ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {movimiento.correlativo_interno} · {movimiento.almacen_nombre}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {formatDate(movimiento.fecha_operacion)} ·{" "}
                        {movimiento.glosa || movimiento.tipo_movimiento_display}
                      </p>
                    </div>
                    <StatusBadge value={movimiento.estado} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {can(rol, "ple:read") && (
        <Card className="mt-6 border-emerald-200 bg-emerald-50/40">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Libros PLE listos para validar
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Revisa los errores por línea antes de descargar el 12.1 o 13.1.
                </p>
              </div>
            </div>
            <Link to="/ple">
              <Button variant="secondary">Abrir centro PLE</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
