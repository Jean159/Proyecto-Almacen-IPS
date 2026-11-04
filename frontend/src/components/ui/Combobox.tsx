import {
  Combobox as HeadlessCombobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/cn";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Buscar…",
  emptyMessage = "Sin resultados",
  onQueryChange,
  loading,
  disabled,
  className,
}: {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  emptyMessage?: string;
  onQueryChange?: (query: string) => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value);

  return (
    <HeadlessCombobox
      value={value}
      onChange={onChange}
      onClose={() => setQuery("")}
      disabled={disabled}
    >
      <div className={cn("relative", className)}>
        <div className="relative">
          <ComboboxInput
            className="focus-ring w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50"
            displayValue={() => selected?.label ?? ""}
            placeholder={placeholder}
            onChange={(event) => {
              setQuery(event.target.value);
              onQueryChange?.(event.target.value);
            }}
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <ComboboxButton className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700">
            <ChevronsUpDown className="h-4 w-4" />
          </ComboboxButton>
        </div>
        <ComboboxOptions className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {loading ? (
            <div className="px-3 py-2 text-xs text-slate-500">Buscando…</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">{emptyMessage}</div>
          ) : (
            options.map((option) => (
              <ComboboxOption
                key={option.value}
                value={option.value}
                className="group flex cursor-pointer items-start gap-2 px-3 py-2 text-sm data-[focus]:bg-emerald-50"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 opacity-0 group-data-[selected]:opacity-100" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="block truncate text-xs text-slate-500">
                      {option.description}
                    </span>
                  )}
                </span>
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
        {query && options.length === 0 && !loading && (
          <span className="sr-only">{emptyMessage}</span>
        )}
      </div>
    </HeadlessCombobox>
  );
}
