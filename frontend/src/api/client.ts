import axios, { type AxiosRequestConfig } from "axios";

import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { useEmpresaStore } from "@/stores/empresaStore";

const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

const refreshClient = axios.create({ baseURL: API_URL });

let refreshPromise: Promise<string> | null = null;

interface RetryConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

function clearSession() {
  useAuthStore.getState().logout();
  useEmpresaStore.getState().clear();
  queryClient.clear();
}

async function refreshAccessToken(): Promise<string> {
  const refresh = useAuthStore.getState().refreshToken;
  if (!refresh) throw new Error("No hay refresh token.");
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<{ access: string; refresh?: string }>("/auth/refresh/", { refresh })
      .then((response) => {
        useAuthStore
          .getState()
          .setTokens(response.data.access, response.data.refresh);
        return response.data.access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  const empresa = useEmpresaStore.getState().empresa;
  const isAuthCall = config.url?.includes("/auth/");
  if (empresa && !isAuthCall) {
    config.headers["X-Empresa-ID"] = empresa.id;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetryConfig | undefined;
    const isAuthCall =
      original?.url?.includes("/auth/login/") ||
      original?.url?.includes("/auth/refresh/");
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      isAuthCall
    ) {
      return Promise.reject(error);
    }
    const refresh = useAuthStore.getState().refreshToken;
    if (!refresh) {
      clearSession();
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      const accessToken = await refreshAccessToken();
      original.headers = {
        ...original.headers,
        Authorization: `Bearer ${accessToken}`,
      };
      return api(original);
    } catch (refreshError) {
      clearSession();
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
      return Promise.reject(refreshError);
    }
  },
);

export function cleanParams<T extends Record<string, unknown>>(params: T): T {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  ) as T;
}

async function blobToApiError(blob: Blob) {
  const text = await blob.text();
  try {
    const data = JSON.parse(text) as {
      detail?: string;
      codigo?: string;
      campos?: Record<string, unknown>;
      errores?: unknown;
    };
    return {
      detail: data.detail ?? "No se pudo descargar el archivo.",
      codigo: data.codigo ?? "download_error",
      campos: data.campos ?? {},
      errores: data.errores,
    };
  } catch {
    return {
      detail: text || "No se pudo descargar el archivo.",
      codigo: "download_error",
      campos: {},
    };
  }
}

export async function downloadFile(
  path: string,
  params?: Record<string, unknown>,
): Promise<string> {
  try {
    const response = await api.get<Blob>(path, {
      params: cleanParams(params ?? {}),
      responseType: "blob",
    });
    const disposition = response.headers["content-disposition"] as
      | string
      | undefined;
    const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    const fallback = path.split("/").filter(Boolean).pop() ?? "archivo";
    const filename = match ? decodeURIComponent(match[1]) : fallback;
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return filename;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      const parsed = await blobToApiError(error.response.data);
      throw Object.assign(new Error(parsed.detail), parsed);
    }
    throw error;
  }
}

export { API_URL, clearSession };
