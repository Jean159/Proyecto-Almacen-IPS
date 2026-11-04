import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { almacenesApi } from "@/api/almacenes";
import { catalogoApi } from "@/api/catalogo";
import { inventarioApi, type ReservaPayload } from "@/api/inventario";
import { RoleGate } from "@/components/layout/RoleGate";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Modal";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Field, Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import type { ReservaForm } from "@/lib/schemas";
import { useEmpresaStore } from "@/stores/empresaStore";
import type { ReservaStock } from "@/types/domain";
import { ReservaFormModal } from "@/features/stock/ReservaFormModal";

export function ReservasPage() {
  const empresa = useEmpresaStore((state) => state.empresa);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState("");
  const [almacen, setAlmacen] = useState("");
  const [producto, setProducto] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [accion, setAccion] = useState<{
    reserva: ReservaStock;
    tipo: "liberar" | "consumir";
  } | null>(null);
  const pageSize = 20;

  const almacenesQuery = useQuery({
    queryKey: queryKeys.almacenes(empresa?.id, { page_size: 100 }),
    queryFn: () => almacenesApi.list({ page_size: 100 }),
    enabled: Boolean(empresa),
  });
  const productosQuery = useQuery({
    queryKey: queryKeys.productos(empresa?.id, { page_size: 200 }),
    queryFn: () => catalogoApi.productos({ page_size: 200 }),
    enabled: Boolean(empresa),
  });
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.reservas(empresa?.id, { page, estado, almacen, producto }),
    queryFn: () =>
      inventarioApi.reservas({
        page,
        page_size: pageSize,
        estado: estado || undefined,
        almacen: almacen || undefined,
        producto: producto || undefined,
      }),
    enabled: Boolean(empresa),
  });

  const guardar = useMutation({
    mutationFn: (values: ReservaForm) => {
      const payload: ReservaPayload = {
        almacen: values.almacen,
        producto: values.producto,
        ubicacion: values.ubicacion || null,
        lote_serie: values.lote_serie || null,
        cantidad: values.cantidad,
        expira_en: values.expira_en ? new Date(values.expira_en).toISOString() : null,
        referencia: values.referencia,
      };
      return inventarioApi.crearReserva(payload);
    },
    onSuccess: () => {
      toast.success("Reserva creada");
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["reservas", empresa?.id] });
      queryClient.invalidateQueries({ queryKey: ["stock", empresa?.id] });
    },
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ reserva, tipo }: { reserva: ReservaStock; tipo: "liberar" | "consumir" }) =>
      tipo === "liberar"
        ? inventarioApi.liberarReserva(reserva.id)
        : inventarioApi.consumirReserva(reserva.id),
    onSuccess: () => {
      toast.success("Reserva actualizada");
      setAccion(null);
      queryClient.invalidateQueries({ queryKey: ["reservas", empresa?.id] });
      queryClient.invalidateQueries({ queryKey: ["stock", empresa?.id] });
    },
  });

  const columns: DataTableColumn<ReservaStock>[] = [
    {
      key: "producto",
      header: "Producto",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.producto_sku}</p>
          <p className="text-[11px] text-slate-500">{row.almacen_nombre}</p>
        </div>
      ),
    },
    {
      key: "cantidad",
      header: "Cantidad",
      align: "right",
      render: (row) => (
        <span className="numeric text-sm font-bold text-slate-800">
          {formatQuantity(row.cantidad, 2)}
        </span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => <StatusBadge value={row.estado} />,
    },
    {
      key: "expira",
      header: "Expira",
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.expira_en ? formatDateTime(row.expira_en) : "Sin expiración"}
        </span>
      ),
    },
    {
      key: "referencia",
      header: "Referencia",
      render: (row) => (
        <span className="text-xs text-slate-600">{row.referencia || "—"}</span>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (row) =>
        row.estado === "ACTIVA" ? (
          <div className="flex justify-end gap-1">
            <RoleGate permission="stock:write">
              <Button
                variant="ghost"
                size="sm"
                title="Liberar reserva"
                onClick={() => setAccion({ reserva: row, tipo: "liberar" })}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title="Consumir reserva"
                onClick={() => setAccion({ reserva: row, tipo: "consumir" })}
              >
                <Check className="h-4 w-4" />
              </Button>
            </RoleGate>
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Inventario"
        title="Reservas de stock"
        description="Compromete unidades para pedidos y controla su liberación o consumo."
        actions={
          <RoleGate permission="stock:write">
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
              Nueva reserva
            </Button>
          </RoleGate>
        }
      />

      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-3">
          <Field label="Almacén">
            <Select value={almacen} onChange={(event) => setAlmacen(event.target.value)}>
              <option value="">Todos</option>
              {almacenesQuery.data?.results.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo} · {item.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Producto">
            <Select value={producto} onChange={(event) => setProducto(event.target.value)}>
              <option value="">Todos</option>
              {productosQuery.data?.results.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} · {item.descripcion}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado">
            <Select value={estado} onChange={(event) => setEstado(event.target.value)}>
              <option value="">Todos</option>
              <option value="ACTIVA">Activa</option>
              <option value="LIBERADA">Liberada</option>
              <option value="CONSUMIDA">Consumida</option>
              <option value="VENCIDA">Vencida</option>
            </Select>
          </Field>
        </div>
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          rowKey={(row) => row.id}
          loading={isLoading}
          error={error ? errorMessage(error) : null}
          emptyIcon={CalendarClock}
          emptyTitle="Sin reservas"
          emptyDescription="Crea una reserva para comprometer stock de un pedido."
        />
        {data && data.count > pageSize && (
          <Pagination page={page} pageSize={pageSize} count={data.count} onPageChange={setPage} />
        )}
      </Card>

      <ReservaFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        almacenes={almacenesQuery.data?.results ?? []}
        productos={productosQuery.data?.results ?? []}
        onSubmit={async (values) => {
          await guardar.mutateAsync(values);
        }}
      />
      {guardar.isError && (
        <p className="mt-2 text-xs text-rose-600">{errorMessage(guardar.error)}</p>
      )}

      <ConfirmDialog
        open={Boolean(accion)}
        onClose={() => setAccion(null)}
        onConfirm={() => {
          if (accion) cambiarEstado.mutate(accion);
        }}
        title={accion?.tipo === "consumir" ? "Consumir reserva" : "Liberar reserva"}
        description={
          accion?.tipo === "consumir"
            ? `La reserva de ${accion.reserva.producto_sku} se marcará como consumida y dejará de bloquear stock.`
            : `La reserva de ${accion?.reserva.producto_sku} se liberará y el stock volverá a estar disponible.`
        }
        confirmLabel={accion?.tipo === "consumir" ? "Consumir" : "Liberar"}
        loading={cambiarEstado.isPending}
        danger={accion?.tipo === "consumir"}
      />
    </div>
  );
}
