import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { catalogoApi, type LotePayload } from "@/api/catalogo";
import { RoleGate } from "@/components/layout/RoleGate";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Field, Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { useDebounce } from "@/hooks/useDebounce";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import type { LoteForm } from "@/lib/schemas";
import { useEmpresaStore } from "@/stores/empresaStore";
import type { LoteSerie } from "@/types/domain";
import { LoteFormModal } from "@/features/catalogo/LoteFormModal";

export function LotesPage() {
  const empresa = useEmpresaStore((state) => state.empresa);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [producto, setProducto] = useState("");
  const [estado, setEstado] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<LoteSerie | null>(null);
  const debouncedSearch = useDebounce(search);
  const pageSize = 20;

  const productosQuery = useQuery({
    queryKey: queryKeys.productos(empresa?.id, { page_size: 200 }),
    queryFn: () => catalogoApi.productos({ page_size: 200 }),
    enabled: Boolean(empresa),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.lotes(empresa?.id, { page, search: debouncedSearch, producto, estado }),
    queryFn: () =>
      catalogoApi.lotes({
        page,
        page_size: pageSize,
        search: debouncedSearch,
        producto: producto || undefined,
        estado: estado || undefined,
      }),
    enabled: Boolean(empresa),
  });

  const guardar = useMutation({
    mutationFn: (values: LoteForm) => {
      const payload: LotePayload = {
        producto: values.producto,
        numero_lote_serie: values.numero_lote_serie,
        fecha_fabricacion: values.fecha_fabricacion || null,
        fecha_vencimiento: values.fecha_vencimiento || null,
        estado: values.estado,
        activo: values.activo,
      };
      return editando
        ? catalogoApi.actualizarLote(editando.id, payload)
        : catalogoApi.crearLote(payload);
    },
    onSuccess: () => {
      toast.success(editando ? "Lote actualizado" : "Lote creado");
      setModalOpen(false);
      setEditando(null);
      queryClient.invalidateQueries({ queryKey: ["lotes", empresa?.id] });
    },
  });

  const columns: DataTableColumn<LoteSerie>[] = [
    {
      key: "lote",
      header: "Lote / serie",
      render: (row) => (
        <div>
          <p className="font-mono text-xs font-semibold text-slate-900">
            {row.numero_lote_serie}
          </p>
          <p className="text-[11px] text-slate-500">
            {row.producto_sku} · {row.producto_descripcion}
          </p>
        </div>
      ),
    },
    {
      key: "vencimiento",
      header: "Vencimiento",
      render: (row) => (
        <span className="text-xs text-slate-600">
          {row.fecha_vencimiento ? formatDate(row.fecha_vencimiento) : "Sin vencimiento"}
        </span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => <StatusBadge value={row.estado} />,
    },
    {
      key: "activo",
      header: "Activo",
      render: (row) => (
        <span className={row.activo ? "text-emerald-700" : "text-slate-400"}>
          {row.activo ? "Sí" : "No"}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (row) => (
        <RoleGate permission="catalog:write">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditando(row);
              setModalOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </RoleGate>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Lotes y series"
        description="Trazabilidad por lote, vencimiento y número de serie."
        actions={
          <RoleGate permission="catalog:write">
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditando(null);
                setModalOpen(true);
              }}
            >
              Nuevo lote
            </Button>
          </RoleGate>
        }
      />

      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[1fr_260px_180px]">
          <SearchInput
            placeholder="Buscar lote, SKU o producto…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Field label="Producto">
            <Select
              value={producto}
              onChange={(event) => {
                setProducto(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {productosQuery.data?.results.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} · {item.descripcion}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado">
            <Select
              value={estado}
              onChange={(event) => {
                setEstado(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option value="DISPONIBLE">Disponible</option>
              <option value="CUARENTENA">Cuarentena</option>
              <option value="VENCIDO">Vencido</option>
            </Select>
          </Field>
        </div>
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          rowKey={(row) => row.id}
          loading={isLoading}
          error={error ? errorMessage(error) : null}
          emptyIcon={Boxes}
          emptyTitle="Sin lotes ni series"
          emptyDescription="Registra lotes para productos que requieren trazabilidad."
        />
        {data && data.count > pageSize && (
          <Pagination page={page} pageSize={pageSize} count={data.count} onPageChange={setPage} />
        )}
      </Card>

      <LoteFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditando(null);
        }}
        lote={editando}
        productos={productosQuery.data?.results ?? []}
        onSubmit={async (values) => {
          await guardar.mutateAsync(values);
        }}
      />
      {guardar.isError && (
        <p className="mt-2 text-xs text-rose-600">{errorMessage(guardar.error)}</p>
      )}
    </div>
  );
}
