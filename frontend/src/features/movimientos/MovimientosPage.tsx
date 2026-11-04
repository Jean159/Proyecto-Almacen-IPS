import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Eye, Pencil, Plus, RotateCcw, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { almacenesApi } from "@/api/almacenes";
import { movimientosApi } from "@/api/movimientos";
import { RoleGate } from "@/components/layout/RoleGate";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Modal";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Field, Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { useDebounce } from "@/hooks/useDebounce";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { useEmpresaStore } from "@/stores/empresaStore";
import type { MovimientoListItem } from "@/types/domain";

export function MovimientosPage() {
  const empresa = useEmpresaStore((state) => state.empresa);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [almacen, setAlmacen] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [confirmar, setConfirmar] = useState<MovimientoListItem | null>(null);
  const [anular, setAnular] = useState<MovimientoListItem | null>(null);
  const debouncedSearch = useDebounce(search);
  const pageSize = 20;

  const almacenesQuery = useQuery({
    queryKey: queryKeys.almacenes(empresa?.id, { page_size: 100 }),
    queryFn: () => almacenesApi.list({ page_size: 100 }),
    enabled: Boolean(empresa),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.movimientos(empresa?.id, {
      page,
      search: debouncedSearch,
      tipo,
      estado,
      almacen,
      fechaDesde,
      fechaHasta,
    }),
    queryFn: () =>
      movimientosApi.list({
        page,
        page_size: pageSize,
        search: debouncedSearch,
        tipo_movimiento: tipo || undefined,
        estado: estado || undefined,
        almacen: almacen || undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
      }),
    enabled: Boolean(empresa),
  });

  const confirmarMutation = useMutation({
    mutationFn: (movimiento: MovimientoListItem) =>
      movimientosApi.confirmar(movimiento.id, crypto.randomUUID()),
    onSuccess: () => {
      toast.success("Movimiento confirmado");
      setConfirmar(null);
      invalidar();
    },
  });

  const anularMutation = useMutation({
    mutationFn: (movimiento: MovimientoListItem) => movimientosApi.anular(movimiento.id),
    onSuccess: () => {
      toast.success("Movimiento anulado con contra-movimiento");
      setAnular(null);
      invalidar();
    },
  });

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["movimientos", empresa?.id] });
    queryClient.invalidateQueries({ queryKey: ["stock", empresa?.id] });
    queryClient.invalidateQueries({ queryKey: ["kardex", empresa?.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", empresa?.id] });
  }

  const columns: DataTableColumn<MovimientoListItem>[] = [
    {
      key: "correlativo",
      header: "Movimiento",
      render: (row) => (
        <div>
          <p className="font-mono text-xs font-semibold text-slate-900">
            {row.correlativo_interno}
          </p>
          <p className="text-[11px] text-slate-500">
            {formatDate(row.fecha_operacion)} · {row.tipo_movimiento_display}
          </p>
        </div>
      ),
    },
    {
      key: "almacen",
      header: "Almacén",
      render: (row) => (
        <div className="text-xs text-slate-600">
          <p>{row.almacen_nombre}</p>
          {row.almacen_destino && <p className="text-[11px] text-slate-400">→ {row.almacen_destino}</p>}
        </div>
      ),
    },
    {
      key: "documento",
      header: "Documento",
      render: (row) => (
        <div className="text-xs text-slate-600">
          <p>{row.tipo_operacion_sunat} · {row.serie_comprobante}-{row.numero_comprobante}</p>
          <p className="text-[11px] text-slate-400">Comprobante {row.tipo_comprobante_sunat}</p>
        </div>
      ),
    },
    {
      key: "glosa",
      header: "Glosa",
      render: (row) => (
        <span className="block max-w-[220px] truncate text-xs text-slate-500">
          {row.glosa || "—"}
        </span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => <StatusBadge value={row.estado} />,
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Link to={`/movimientos/${row.id}`}>
            <Button variant="ghost" size="sm" title="Ver detalle">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {row.estado === "BORRADOR" && (
            <>
              <Link to={`/movimientos/${row.id}/editar`}>
                <RoleGate permission="movement:write">
                  <Button variant="ghost" size="sm" title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </RoleGate>
              </Link>
              <RoleGate permission="movement:confirm">
                <Button variant="ghost" size="sm" title="Confirmar" onClick={() => setConfirmar(row)}>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </Button>
              </RoleGate>
            </>
          )}
          {row.estado === "CONFIRMADO" && (
            <RoleGate permission="movement:annul">
              <Button variant="ghost" size="sm" title="Anular" onClick={() => setAnular(row)}>
                <RotateCcw className="h-4 w-4 text-rose-600" />
              </Button>
            </RoleGate>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Operación"
        title="Movimientos"
        description="Entradas, salidas, transferencias y ajustes con trazabilidad SUNAT."
        actions={
          <RoleGate permission="movement:write">
            <Link to="/movimientos/nuevo">
              <Button leftIcon={<Plus className="h-4 w-4" />}>Nuevo movimiento</Button>
            </Link>
          </RoleGate>
        }
      />

      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 xl:grid-cols-[1.2fr_180px_170px_220px_140px_140px]">
          <SearchInput
            placeholder="Buscar correlativo, glosa o comprobante…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Field label="Tipo">
            <Select value={tipo} onChange={(event) => setTipo(event.target.value)}>
              <option value="">Todos</option>
              <option value="ENTRADA">Entrada</option>
              <option value="SALIDA">Salida</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="AJUSTE">Ajuste</option>
            </Select>
          </Field>
          <Field label="Estado">
            <Select value={estado} onChange={(event) => setEstado(event.target.value)}>
              <option value="">Todos</option>
              <option value="BORRADOR">Borrador</option>
              <option value="CONFIRMADO">Confirmado</option>
              <option value="ANULADO">Anulado</option>
            </Select>
          </Field>
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
          <Field label="Desde">
            <input
              type="date"
              value={fechaDesde}
              onChange={(event) => setFechaDesde(event.target.value)}
              className="focus-ring h-10 w-full rounded-lg border border-slate-300 px-3 text-xs"
            />
          </Field>
          <Field label="Hasta">
            <input
              type="date"
              value={fechaHasta}
              onChange={(event) => setFechaHasta(event.target.value)}
              className="focus-ring h-10 w-full rounded-lg border border-slate-300 px-3 text-xs"
            />
          </Field>
        </div>
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          rowKey={(row) => row.id}
          loading={isLoading}
          error={error ? errorMessage(error) : null}
          emptyIcon={ClipboardList}
          emptyTitle="Sin movimientos"
          emptyDescription="Registra una entrada o salida para iniciar el kardex."
        />
        {data && data.count > pageSize && (
          <Pagination page={page} pageSize={pageSize} count={data.count} onPageChange={setPage} />
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(confirmar)}
        onClose={() => setConfirmar(null)}
        onConfirm={() => confirmar && confirmarMutation.mutate(confirmar)}
        title="Confirmar movimiento"
        description={`El movimiento ${confirmar?.correlativo_interno} afectará el stock y el kardex de forma definitiva.`}
        confirmLabel="Confirmar"
        loading={confirmarMutation.isPending}
      />
      <ConfirmDialog
        open={Boolean(anular)}
        onClose={() => setAnular(null)}
        onConfirm={() => anular && anularMutation.mutate(anular)}
        title="Anular movimiento"
        description={`Se generará un contra-movimiento para anular ${anular?.correlativo_interno}. El kardex original no se modificará.`}
        confirmLabel="Anular y revertir"
        loading={anularMutation.isPending}
        danger
      />
      {confirmarMutation.isError && (
        <p className="mt-2 text-xs text-rose-600">{errorMessage(confirmarMutation.error)}</p>
      )}
      {anularMutation.isError && (
        <p className="mt-2 text-xs text-rose-600">{errorMessage(anularMutation.error)}</p>
      )}
    </div>
  );
}
