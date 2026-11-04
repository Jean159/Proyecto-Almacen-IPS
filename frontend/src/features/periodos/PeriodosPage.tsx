import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Lock, LockOpen, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { periodosApi } from "@/api/periodos";
import { RoleGate } from "@/components/layout/RoleGate";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Field, Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, monthOptions } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { useEmpresaStore } from "@/stores/empresaStore";
import type { CierrePeriodo } from "@/types/domain";

export function PeriodosPage() {
  const empresa = useEmpresaStore((state) => state.empresa);
  const queryClient = useQueryClient();
  const months = monthOptions(24);
  const [modalOpen, setModalOpen] = useState(false);
  const [periodo, setPeriodo] = useState(months[0]?.value ?? "");
  const [estado, setEstado] = useState<"ABIERTO" | "CERRADO">("CERRADO");
  const [accion, setAccion] = useState<{ cierre: CierrePeriodo; tipo: "cerrar" | "abrir" } | null>(
    null,
  );

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.periodos(empresa?.id),
    queryFn: () => periodosApi.list({ page_size: 100 }),
    enabled: Boolean(empresa),
  });

  const crear = useMutation({
    mutationFn: () => {
      const [anio, mes] = periodo.split("-").map(Number);
      return periodosApi.create({ anio, mes, estado });
    },
    onSuccess: () => {
      toast.success("Periodo registrado");
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["periodos", empresa?.id] });
    },
    onError: (mutationError) => toast.error(errorMessage(mutationError)),
  });

  const cambiar = useMutation({
    mutationFn: ({ cierre, tipo }: { cierre: CierrePeriodo; tipo: "cerrar" | "abrir" }) =>
      tipo === "cerrar" ? periodosApi.cerrar(cierre.id) : periodosApi.abrir(cierre.id),
    onSuccess: () => {
      toast.success("Estado del periodo actualizado");
      setAccion(null);
      queryClient.invalidateQueries({ queryKey: ["periodos", empresa?.id] });
    },
    onError: (mutationError) => toast.error(errorMessage(mutationError)),
  });

  const columns: DataTableColumn<CierrePeriodo>[] = [
    {
      key: "periodo",
      header: "Periodo",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">
            {String(row.mes).padStart(2, "0")}/{row.anio}
          </p>
          <p className="text-[11px] text-slate-500">Cierre contable</p>
        </div>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => <StatusBadge value={row.estado} />,
    },
    {
      key: "cierre",
      header: "Cerrado por",
      render: (row) => (
        <span className="text-xs text-slate-600">
          {row.cerrado_en ? formatDateTime(row.cerrado_en) : "—"}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (row) => (
        <RoleGate permission="period:write">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setAccion({
                cierre: row,
                tipo: row.estado === "CERRADO" ? "abrir" : "cerrar",
              })
            }
          >
            {row.estado === "CERRADO" ? (
              <LockOpen className="h-4 w-4 text-emerald-600" />
            ) : (
              <Lock className="h-4 w-4 text-amber-600" />
            )}
          </Button>
        </RoleGate>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Configuración"
        title="Cierre de periodos"
        description="Un periodo cerrado bloquea la confirmación de movimientos con esa fecha."
        actions={
          <RoleGate permission="period:write">
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
              Registrar periodo
            </Button>
          </RoleGate>
        }
      />

      <Card>
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          rowKey={(row) => row.id}
          loading={isLoading}
          error={error ? errorMessage(error) : null}
          emptyIcon={CalendarClock}
          emptyTitle="Sin periodos configurados"
          emptyDescription="Registra un periodo para controlar el cierre contable."
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar periodo"
        description="Puedes crearlo abierto o cerrado; luego cambia su estado."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => crear.mutate()} loading={crear.isPending}>
              Registrar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Periodo">
            <Select value={periodo} onChange={(event) => setPeriodo(event.target.value)}>
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado inicial">
            <Select
              value={estado}
              onChange={(event) => setEstado(event.target.value as "ABIERTO" | "CERRADO")}
            >
              <option value="ABIERTO">Abierto</option>
              <option value="CERRADO">Cerrado</option>
            </Select>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(accion)}
        onClose={() => setAccion(null)}
        onConfirm={() => accion && cambiar.mutate(accion)}
        title={accion?.tipo === "cerrar" ? "Cerrar periodo" : "Abrir periodo"}
        description={
          accion?.tipo === "cerrar"
            ? `El periodo ${accion.cierre.mes}/${accion.cierre.anio} bloqueará nuevos movimientos.`
            : `El periodo ${accion?.cierre.mes}/${accion?.cierre.anio} volverá a permitir movimientos.`
        }
        confirmLabel={accion?.tipo === "cerrar" ? "Cerrar periodo" : "Abrir periodo"}
        loading={cambiar.isPending}
        danger={accion?.tipo === "cerrar"}
      />
    </div>
  );
}
