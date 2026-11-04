import {
  Dialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { AlertTriangle, X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const sizes = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof sizes;
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-navy-950/50 backdrop-blur-[2px]" aria-hidden />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          className={cn(
            "max-h-[90vh] w-full overflow-hidden rounded-2xl bg-white shadow-2xl",
            sizes[size],
          )}
        >
          <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <DialogTitle className="text-base font-bold text-slate-950">
                {title}
              </DialogTitle>
              {description && (
                <p className="mt-1 text-xs text-slate-500">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
              {footer}
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  loading,
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            danger ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600",
          )}
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </Modal>
  );
}
