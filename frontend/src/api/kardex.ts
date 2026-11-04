import { api, cleanParams, downloadFile } from "@/api/client";
import type {
  KardexFila,
  KardexFisico,
  ListParams,
  Paginated,
  SaldoKardex,
} from "@/types/domain";

export const kardexApi = {
  list: (params: ListParams = {}) =>
    api
      .get<Paginated<KardexFila>>("/kardex/", {
        params: cleanParams({ page_size: 100, ...params }),
      })
      .then((response) => response.data),
  fisico: (params: ListParams = {}) =>
    api
      .get<Paginated<KardexFisico>>("/kardex/fisico/", {
        params: cleanParams({ page_size: 100, ...params }),
      })
      .then((response) => response.data),
  saldos: (params: ListParams = {}) =>
    api
      .get<Paginated<SaldoKardex>>("/saldos-kardex/", {
        params: cleanParams({ page_size: 100, ...params }),
      })
      .then((response) => response.data),
  exportar: (params: Record<string, unknown>) =>
    downloadFile("/kardex/export/", params),
};
