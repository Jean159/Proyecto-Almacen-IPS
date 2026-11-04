import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Warehouse } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { almacenesApi, type AlmacenPayload } from "@/api/almacenes";
import { RoleGate } from "@/components/layout/RoleGate";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { useDebounce } from "@/hooks/useDebounce";
import { errorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import { useEmpresaStore } from "@/stores/empresaStore";
import type { Almacen } from "@/types/domain";
import { AlmacenFormModal } from "@/features/almacenes/AlmacenFormModal";
import type { AlmacenForm } from "@/lib/schemas";

export function AlmacenesPage() {
  const empresa = useEmpresaStore((state) => state.empresa);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Almacen | null>(null);
  const debouncedSearch = useDebounce(search);
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.almacenes(empresa?.id, { page, search: debouncedSearch }),
    queryFn: () =>
      almacenesApi.list({ page, page_size: pageSize, search: debouncedSearch }),
    enabled: Boolean(empresa),
  });

  const guardar = useMutation({
    mutationFn: (values: AlmacenForm) => {
      const payload: AlmacenPayload = {
        codigo: values.codigo,
        codigo_establecimiento: values.codigo_establecimiento,
        codigo_correlativo: values.codigo_correlativo || null,
        nombre: values.nombre,
        direccion: values.direccion,
        ubigeo: values.ubigeo,
        es_almacen_tercero: values.es_almacen_tercero,
        activo: values.activo,
      };
      return editando
        ? almacenesApi.update(editando.id, payload)
        : almacenesApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editando ? "Almacén actualizado" : "Almacén creado");
      setModalOpen(false);
      setEditando(null);
      queryClient.invalidateQueries({ queryKey: ["almacenes", empresa?.id] });
    },
  });

  const columns: DataTableColumn<Almacen>[] = [
    {
      key: "codigo",
      header: "Código",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.codigo}</p>
          <p className="text-[11px] text-slate-500">SUNAT {row.codigo_sunat}</p>
        </div>
      ),
    },
    {
      key: "nombre",
      header: "Almacén",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800">{row.nombre}</p>
          <p className="text-[11px] text-slate-500">{row.direccion}</p>
        </div>
      ),
    },
    {
      key: "ubicaciones",
      header: "Ubicaciones",
      align: "right",
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs text-slate-600">
          <MapPin className="h-3.5 w-3.5" />
          {row.ubicaciones_count ?? 0}
        </span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => (
        <Badge tone={row.activo ? "emerald" : "slate"}>
          {row.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Link to={`/almacenes/${row.id}/ubicaciones`}>
            <Button variant="ghost" size="sm" title="Ver ubicaciones">
              <MapPin className="h-4 w-4" />
            </Button>
          </Link>
          <RoleGate permission="warehouse:write">
            <Button
              variant="ghost"
              size="sm"
              title="Editar"
              onClick={() => {
                setEditando(row);
                setModalOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </RoleGate>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Infraestructura"
        title="Almacenes"
        description="Gestiona los establecimientos y almacenes de tu empresa."
        actions={
          <RoleGate permission="warehouse:write">
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditando(null);
                setModalOpen(true);
              }}
            >
              Nuevo almacén
            </Button>
          </RoleGate>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            className="w-full sm:max-w-xs"
            placeholder="Buscar por código, nombre o dirección…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <p className="text-xs text-slate-500">
            {data?.count ?? 0} almacén(es) registrado(s)
          </p>
        </div>
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          rowKey={(row) => row.id}
          loading={isLoading}
          error={error ? errorMessage(error) : null}
          emptyIcon={Warehouse}
          emptyTitle="Sin almacenes"
          emptyDescription="Crea tu primer almacén para comenzar a registrar stock."
        />
        {data && data.count > pageSize && (
          <Pagination
            page={page}
            pageSize={pageSize}
            count={data.count}
            onPageChange={setPage}
          />
        )}
      </Card>

      <AlmacenFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditando(null);
        }}
        almacen={editando}
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
