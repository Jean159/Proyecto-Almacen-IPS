import axios from "axios";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

export interface NormalizedApiError {
  detail: string;
  codigo: string;
  campos: Record<string, unknown>;
  status?: number;
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as
      | { detail?: string; codigo?: string; campos?: Record<string, unknown> }
      | undefined;
    if (data) {
      return {
        detail: data.detail ?? "No se pudo completar la operación.",
        codigo: data.codigo ?? "error",
        campos: data.campos ?? {},
        status,
      };
    }
    if (error.code === "ERR_NETWORK") {
      return {
        detail: "No se pudo conectar con el servidor.",
        codigo: "network_error",
        campos: {},
        status,
      };
    }
    return {
      detail: error.message,
      codigo: "error",
      campos: {},
      status,
    };
  }
  if (error instanceof Error) {
    return { detail: error.message, codigo: "error", campos: {} };
  }
  return { detail: "Ocurrió un error inesperado.", codigo: "error", campos: {} };
}

export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
) {
  const normalized = normalizeApiError(error);
  Object.entries(normalized.campos).forEach(([field, messages]) => {
    const message = Array.isArray(messages) ? messages[0] : messages;
    if (typeof message === "string") {
      setError(field as Path<T>, { type: "server", message });
    }
  });
  return normalized;
}

export function errorMessage(error: unknown): string {
  return normalizeApiError(error).detail;
}
