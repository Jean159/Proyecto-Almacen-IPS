import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { almacenesApi, ubicacionesApi, type UbicacionPayload } from "@/api/almacenes";
import { RoleGate } from "@/components/layout/RoleGate";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Field, Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { useDebounce } from "@/hooks/useDebounce";
import { errorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import type { UbicacionForm } from "@/lib/schemas";
import { useEmpresaStore } from "@/stores/empresaStore";
import type { Ubicacion } from "@/types/domain";
import { UbicacionFormModal } from "@/features/almacenes/UbicacionFormModal";

export function UbicacionesPage() {
  const { almacenId } = useParams<{ almacenId?: string }>();
  const empresa = useEmpresaStore((state) => state.empresa);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filtroAlmacen, setFiltroAlmacen] = useState(almacenId ?? "");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Ubicacion | null>(null);
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    if (almacenId) setFiltroAlmacen(almacenId);
  }, [almacenId]);

  const almacenesQuery = useQuery({
    queryKey: queryKeys.almacenes(empresa?.id, { page_size: 100 }),
    queryFn: () => almacenesApi.list({ page_size: 100 }),
    enabled: Boolean(empresa),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.ubicaciones(empresa?.id, {
      almacen: filtroAlmacen,
      search: debouncedSearch,
    }),
    queryFn: () =>
      ubicacionesApi.list({
        page_size: 200,
        almacen: filtroAlmacen || undefined,
        search: debouncedSearch,
      }),
    enabled: Boolean(empresa),
  });

  const guardar = useMutation({
    mutationFn: (values: UbicacionForm) => {
      const payload: UbicacionPayload = {
        almacen: values.almacen,
        codigo: values.codigo,
        descripcion: values.descripcion,
        capacidad_peso_kg: values.capacidad_peso_kg || null,
        capacidad_volumen_m3: values.capacidad_volumen_m3 || null,
        activo: values.activo,
      };
      return editando
        ? ubicacionesApi.update(editando.id, payload)
        : ubicacionesApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editando ? "Ubicación actualizada" : "Ubicación creada");
      setModalOpen(false);
      setEditando(null);
      queryClient.invalidateQueries({ queryKey: ["ubicaciones", empresa?.id] });
      queryClient.invalidateQueries({ queryKey: ["almacenes", empresa?.id] });
    },
  });

  const columns: DataTableColumn<Ubicacion>[] = [
    {
      key: "codigo",
      header: "Código",
      render: (row) => (
        <div>
          <p className="font-mono text-xs font-semibold text-slate-900">{row.codigo}</p>
          <p className="text-[11px] text-slate-500">{row.descripcion || "Sin descripción"}</p>
        </div>
      ),
    },
    {
      key: "almacen",
      header: "Almacén",
      render: (row) => (
        <span className="text-xs text-slate-600">
          {row.almacen_codigo} · {row.almacen_nombre}
        </span>
      ),
    },
    {
      key: "capacidad",
      header: "Capacidad",
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.capacidad_peso_kg ? `${row.capacidad_peso_kg} kg` : "—"}
          {row.capacidad_volumen_m3 ? ` · ${row.capacidad_volumen_m3} m³` : ""}
        </span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => (
        <Badge tone={row.activo ? "emerald" : "slate"}>
          {row.activo ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (row) => (
        <RoleGate permission="warehouse:write">
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

  const almacenes = almacenesQuery.data?.results ?? [];
  const almacenFijo = almacenId || filtroAlmacen || undefined;

  return (
    <div>
      <PageHeader
        eyebrow="Infraestructura"
        title="Ubicaciones"
        description="Organiza pasillos, racks y niveles para ubicar el stock."
        actions={
          <RoleGate permission="warehouse:write">
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditando(null);
                setModalOpen(true);
              }}
            >
              Nueva ubicación
            </Button>
          </RoleGate>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <SearchInput
              className="w-full sm:w-72"
              placeholder="Buscar ubicación…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="w-full sm:w-64">
              <Field label="Almacén">
                <Select
                  value={filtroAlmacen}
                  onChange={(event) => setFiltroAlmacen(event.target.value)}
                  disabled={Boolean(almacenId)}
                >
                  <option value="">Todos los almacenes</option>
                  {almacenes.map((almacen) => (
                    <option key={almacen.id} value={almacen.id}>
                      {almacen.codigo} · {almacen.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
          <p className="text-xs text-slate-500">{data?.count ?? 0} ubicación(es)</p>
        </div>
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          rowKey={(row) => row.id}
          loading={isLoading}
          error={error ? errorMessage(error) : null}
          emptyIcon={MapPin}
          emptyTitle="Sin ubicaciones"
          emptyDescription="Crea la primera ubicación física del almacén."
        />
      </Card>

      <UbicacionFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditando(null);
        }}
        ubicacion={editando}
        almacenes={almacenes}
        almacenFijo={almacenFijo}
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
