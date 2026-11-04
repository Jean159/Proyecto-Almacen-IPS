import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function Pagination({
  page,
  pageSize,
  count,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const start = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, count);
  const pages: number[] = [];
  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, page + 2);
  for (let index = from; index <= to; index += 1) pages.push(index);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        Mostrando <span className="font-semibold text-slate-700">{start}</span>–
        <span className="font-semibold text-slate-700">{end}</span> de{" "}
        <span className="font-semibold text-slate-700">{count}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {from > 1 && (
          <>
            <Button variant="ghost" size="sm" onClick={() => onPageChange(1)}>
              1
            </Button>
            {from > 2 && <span className="px-1 text-xs text-slate-400">…</span>}
          </>
        )}
        {pages.map((item) => (
          <Button
            key={item}
            variant={item === page ? "secondary" : "ghost"}
            size="sm"
            className={cn("min-w-8", item === page && "pointer-events-none")}
            onClick={() => onPageChange(item)}
          >
            {item}
          </Button>
        ))}
        {to < totalPages && (
          <>
            {to < totalPages - 1 && <span className="px-1 text-xs text-slate-400">…</span>}
            <Button variant="ghost" size="sm" onClick={() => onPageChange(totalPages)}>
              {totalPages}
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
