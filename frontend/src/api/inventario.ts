import { api, cleanParams } from "@/api/client";
import type {
  ListParams,
  Paginated,
  ReservaStock,
  StockResumen,
  StockSaldo,
} from "@/types/domain";

export interface ReservaPayload {
  almacen: string;
  producto: string;
  ubicacion?: string | null;
  lote_serie?: string | null;
  cantidad: string;
  expira_en?: string | null;
  referencia?: string;
}

export const inventarioApi = {
  stock: (params: ListParams = {}) =>
    api
      .get<Paginated<StockSaldo>>("/stock/", {
        params: cleanParams({ page_size: 50, ...params }),
      })
      .then((response) => response.data),
  stockResumen: (params: ListParams = {}) =>
    api
      .get<StockResumen[]>("/stock/resumen/", {
        params: cleanParams(params),
      })
      .then((response) => response.data),
  stockAlertas: () =>
    api
      .get<{ bajo_minimo: StockSaldo[]; por_vencer: StockSaldo[] }>(
        "/stock/alertas/",
      )
      .then((response) => response.data),
  reservas: (params: ListParams = {}) =>
    api
      .get<Paginated<ReservaStock>>("/reservas/", {
        params: cleanParams({ page_size: 50, ...params }),
      })
      .then((response) => response.data),
  crearReserva: (payload: ReservaPayload) =>
    api
      .post<ReservaStock>("/reservas/", payload)
      .then((response) => response.data),
  liberarReserva: (id: string) =>
    api
      .post<ReservaStock>(`/reservas/${id}/liberar/`)
      .then((response) => response.data),
  consumirReserva: (id: string) =>
    api
      .post<ReservaStock>(`/reservas/${id}/consumir/`)
      .then((response) => response.data),
};
