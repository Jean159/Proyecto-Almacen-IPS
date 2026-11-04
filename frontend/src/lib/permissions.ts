import type { Rol } from "@/types/domain";

export type Permission =
  | "catalog:write"
  | "warehouse:write"
  | "stock:write"
  | "movement:write"
  | "movement:confirm"
  | "movement:annul"
  | "ple:read"
  | "period:write";

const PERMISSIONS: Record<Rol, Permission[]> = {
  ADMIN: [
    "catalog:write",
    "warehouse:write",
    "stock:write",
    "movement:write",
    "movement:confirm",
    "movement:annul",
    "ple:read",
    "period:write",
  ],
  JEFE: [
    "catalog:write",
    "warehouse:write",
    "stock:write",
    "movement:write",
    "movement:confirm",
    "movement:annul",
    "ple:read",
    "period:write",
  ],
  OPERADOR: ["movement:write", "movement:confirm", "stock:write"],
  CONSULTA: [],
  AUDITOR: ["ple:read", "period:write"],
};

export function can(role: Rol | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSIONS[role]?.includes(permission) ?? false;
}

export const roleLabels: Record<Rol, string> = {
  ADMIN: "Administrador",
  JEFE: "Jefe de almacén",
  OPERADOR: "Operador",
  CONSULTA: "Consulta",
  AUDITOR: "Auditor",
};
