import type { ReactNode } from "react";

import { useRolActual } from "@/hooks/useAuth";
import { can, type Permission } from "@/lib/permissions";

export function RoleGate({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const rol = useRolActual();
  return <>{can(rol, permission) ? children : fallback}</>;
}
