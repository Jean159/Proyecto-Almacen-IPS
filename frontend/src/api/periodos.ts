import { api, cleanParams } from "@/api/client";
import type { CierrePeriodo, ListParams, Paginated } from "@/types/domain";

export interface PeriodoPayload {
  anio: number;
  mes: number;
  estado: "ABIERTO" | "CERRADO";
}

export const periodosApi = {
  list: (params: ListParams = {}) =>
    api
      .get<Paginated<CierrePeriodo>>("/cierres-periodo/", {
        params: cleanParams({ page_size: 100, ...params }),
      })
      .then((response) => response.data),
  create: (payload: PeriodoPayload) =>
    api
      .post<CierrePeriodo>("/cierres-periodo/", payload)
      .then((response) => response.data),
  cerrar: (id: string) =>
    api
      .post<CierrePeriodo>(`/cierres-periodo/${id}/cerrar/`)
      .then((response) => response.data),
  abrir: (id: string) =>
    api
      .post<CierrePeriodo>(`/cierres-periodo/${id}/abrir/`)
      .then((response) => response.data),
};
