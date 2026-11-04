import { AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  footer?: ReactNode;
  dense?: boolean;
}

const alignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  error,
  emptyTitle = "Sin registros",
  emptyDescription,
  emptyIcon,
  emptyAction,
  onRowClick,
  footer,
  dense,
}: DataTableProps<T>) {
  if (loading) return <TableSkeleton columns={columns.length} />;
  if (error) {
    return (
      <div className="flex items-center gap-3 px-5 py-8 text-sm text-rose-700">
        <AlertTriangle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }
  if (!data.length) {
    return (
      <EmptyState
        icon={emptyIcon ?? AlertTriangle}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="table-scroll">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500",
                    alignClass[column.align ?? "left"],
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "bg-white transition-colors",
                  onRowClick && "cursor-pointer hover:bg-slate-50",
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "whitespace-nowrap px-4 text-slate-700",
                      dense ? "py-2.5" : "py-3.5",
                      alignClass[column.align ?? "left"],
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
