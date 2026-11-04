import { cn } from "@/lib/cn";

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1 rounded-lg bg-slate-100 p-1", className)}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={cn(
            "focus-ring flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition",
            value === item.value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800",
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span className="rounded-full bg-slate-200 px-1.5 text-[10px] text-slate-600">
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
