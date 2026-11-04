import { api, cleanParams, downloadFile } from "@/api/client";
import type { ExportacionPle, PlePreview } from "@/types/domain";

export interface PleParams {
  libro: "12.1" | "13.1";
  anio: number;
  mes: number;
  almacen?: string;
  [key: string]: unknown;
}

export const pleApi = {
  preview: (params: PleParams) =>
    api
      .get<PlePreview>("/ple/preview/", {
        params: cleanParams(params),
      })
      .then((response) => response.data),
  descargar: (params: PleParams) =>
    downloadFile("/ple/descargar/", cleanParams(params)),
  historial: () =>
    api
      .get<ExportacionPle[]>("/ple/historial/")
      .then((response) => response.data),
};
