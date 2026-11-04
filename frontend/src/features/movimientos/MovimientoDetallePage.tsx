import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  Pencil,
  RotateCcw,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { movimientosApi } from "@/api/movimientos";
import { RoleGate } from "@/components/layout/RoleGate";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Modal";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { errorMessage } from "@/lib/errors";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatQuantity,
  formatUnitCost,
} from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { useEmpresaStore } from "@/stores/empresaStore";
import type { EventoMovimiento, MovimientoDetalle } from "@/types/domain";

export function MovimientoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const empresa = useEmpresaStore((state) => state.empresa);
  const queryClient = useQueryClient();
  const [dialogo, setDialogo] = useState<"confirmar" | "anular" | null>(null);

  const { data: movimiento, isLoading, error } = useQuery({
    queryKey: queryKeys.movimiento(id),
    queryFn: () => movimientosApi.get(id!),
    enabled: Boolean(id),
  });
  const eventosQuery = useQuery({
    queryKey: queryKeys.eventos(id),
    queryFn: () => movimientosApi.eventos(id!),
    enabled: Boolean(id),
  });

  const confirmar = useMutation({
    mutationFn: () => movimientosApi.confirmar(id!, crypto.randomUUID()),
    onSuccess: () => {
      toast.success("Movimiento confirmado");
      setDialogo(null);
      invalidar();
    },
    onError: (mutationError) => toast.error(errorMessage(mutationError)),
  });
  const anular = useMutation({
    mutationFn: () => movimientosApi.anular(id!),
    onSuccess: () => {
      toast.success("Movimiento anulado con contra-movimiento");
      setDialogo(null);
      invalidar();
    },
    onError: (mutationError) => toast.error(errorMessage(mutationError)),
  });

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["movimiento", id] });
    queryClient.invalidateQueries({ queryKey: ["movimiento-eventos", id] });
    queryClient.invalidateQueries({ queryKey: ["movimientos", empresa?.id] });
    queryClient.invalidateQueries({ queryKey: ["stock", empresa?.id] });
    queryClient.invalidateQueries({ queryKey: ["kardex", empresa?.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", empresa?.id] });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-44" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !movimiento) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-rose-600">{errorMessage(error)}</p>
          <Link to="/movimientos" className="mt-4 inline-block">
            <Button variant="outline">Volver a movimientos</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const columns: DataTableColumn<MovimientoDetalle>[] = [
    {
      key: "producto",
      header: "Producto",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.producto_sku}</p>
          <p className="max-w-xs truncate text-[11px] text-slate-500">{row.producto_descripcion}</p>
        </div>
      ),
    },
    {
      key: "ubicacion",
      header: "Ubicación / lote",
      render: (row) => (
        <div className="text-xs text-slate-600">
          <p>{row.ubicacion_codigo || "—"}</p>
          {row.ubicacion_destino_codigo && (
            <p className="text-[11px] text-slate-400">→ {row.ubicacion_destino_codigo}</p>
          )}
          {row.lote_numero && <p className="text-[11px] text-slate-400">Lote {row.lote_numero}</p>}
        </div>
      ),
    },
    {
      key: "cantidad",
      header: "Cantidad",
      align: "right",
      render: (row) => (
        <span className="numeric font-semibold text-slate-800">{formatQuantity(row.cantidad, 4)}</span>
      ),
    },
    {
      key: "costo",
      header: "Costo unitario",
      align: "right",
      render: (row) => (
        <span className="numeric text-xs text-slate-600">{formatUnitCost(row.costo_unitario)}</span>
      ),
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (row) => (
        <span className="numeric text-sm font-bold text-slate-900">{formatMoney(row.costo_total)}</span>
      ),
    },
  ];

  const total = movimiento.detalles.reduce(
    (sum, detalle) => sum + Number(detalle.costo_total),
    0,
  );

  return (
    <div>
      <PageHeader
        eyebrow="Movimiento"
        title={movimiento.correlativo_interno}
        description={`${movimiento.tipo_movimiento_display} · ${formatDate(movimiento.fecha_operacion)}`}
        actions={
          <>
            <Link to="/movimientos">
              <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Volver
              </Button>
            </Link>
            {movimiento.estado === "BORRADOR" && (
              <>
                <RoleGate permission="movement:write">
                  <Link to={`/movimientos/${movimiento.id}/editar`}>
                    <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />}>
                      Editar
                    </Button>
                  </Link>
                </RoleGate>
                <RoleGate permission="movement:confirm">
                  <Button
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => setDialogo("confirmar")}
                  >
                    Confirmar
                  </Button>
                </RoleGate>
              </>
            )}
            {movimiento.estado === "CONFIRMADO" && (
              <RoleGate permission="movement:annul">
                <Button
                  variant="danger"
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                  onClick={() => setDialogo("anular")}
                >
                  Anular
                </Button>
              </RoleGate>
            )}
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Cabecera</CardTitle>
              <StatusBadge value={movimiento.estado} />
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tipo</p>
                <p className="text-sm font-semibold text-slate-800">{movimiento.tipo_movimiento_display}</p>
                {movimiento.direccion_ajuste && (
                  <p className="text-xs text-slate-500">Dirección: {movimiento.direccion_ajuste}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Almacén</p>
                <p className="text-sm font-semibold text-slate-800">{movimiento.almacen_nombre}</p>
                {movimiento.almacen_destino_nombre && (
                  <p className="text-xs text-slate-500">→ {movimiento.almacen_destino_nombre}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Documento</p>
                <p className="text-sm font-semibold text-slate-800">
                  {movimiento.tipo_comprobante_display} · {movimiento.serie_comprobante}-
                  {movimiento.numero_comprobante}
                </p>
                <p className="text-xs text-slate-500">
                  Operación {movimiento.tipo_operacion_sunat} · {movimiento.tipo_operacion_display}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Fechas</p>
                <p className="text-sm font-semibold text-slate-800">
                  Operación: {formatDate(movimiento.fecha_operacion)}
                </p>
                <p className="text-xs text-slate-500">
                  Documento: {formatDate(movimiento.fecha_documento)}
                </p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Glosa</p>
                <p className="text-sm text-slate-700">{movimiento.glosa || "Sin glosa"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">CUO contable</p>
                <p className="font-mono text-xs text-slate-600">{movimiento.cuo_contable || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Asiento</p>
                <p className="font-mono text-xs text-slate-600">{movimiento.correlativo_asiento}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Detalles</CardTitle>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Truck className="h-4 w-4" />
                {movimiento.detalles.length} línea(s)
              </div>
            </CardHeader>
            <DataTable
              columns={columns}
              data={movimiento.detalles}
              rowKey={(row) => row.id}
              emptyIcon={FileText}
              emptyTitle="Sin detalles"
            />
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total valorizado</p>
                <p className="text-lg font-black tabular-nums text-slate-900">{formatMoney(total)}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4 text-slate-400" />
                Historial
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventosQuery.isLoading ? (
                <p className="text-xs text-slate-500">Cargando eventos…</p>
              ) : eventosQuery.data?.length ? (
                <ol className="space-y-4">
                  {eventosQuery.data.map((evento: EventoMovimiento) => (
                    <li key={evento.id} className="relative flex gap-3">
                      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <Clock3 className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{evento.accion}</p>
                        <p className="text-[11px] text-slate-500">
                          {evento.usuario_email || "Sistema"} · {formatDateTime(evento.creado_en)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-slate-500">Sin eventos registrados.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Control SUNAT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Estado operación</span>
                <span className="font-semibold text-slate-800">{movimiento.estado_sunat}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Estado comprobante</span>
                <span className="text-right font-medium text-slate-800">{movimiento.tipo_comprobante_display}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Creado</span>
                <span className="text-right text-slate-700">{formatDateTime(movimiento.creado_en)}</span>
              </div>
              {movimiento.confirmado_en && (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Confirmado</span>
                  <span className="text-right text-slate-700">{formatDateTime(movimiento.confirmado_en)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={dialogo === "confirmar"}
        onClose={() => setDialogo(null)}
        onConfirm={() => confirmar.mutate()}
        title="Confirmar movimiento"
        description="El movimiento afectará el stock y el kardex de forma definitiva."
        confirmLabel="Confirmar movimiento"
        loading={confirmar.isPending}
      />
      <ConfirmDialog
        open={dialogo === "anular"}
        onClose={() => setDialogo(null)}
        onConfirm={() => anular.mutate()}
        title="Anular movimiento"
        description="Se creará un contra-movimiento. El kardex original permanecerá inmutable."
        confirmLabel="Anular y revertir"
        loading={anular.isPending}
        danger
      />
    </div>
  );
}
