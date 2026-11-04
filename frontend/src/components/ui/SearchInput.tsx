import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

export function SearchInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input className="pl-9" {...props} />
    </div>
  );
}
