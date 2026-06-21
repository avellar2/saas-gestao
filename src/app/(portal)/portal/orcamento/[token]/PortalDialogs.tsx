"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle, Loader2, XIcon, XCircle, MessageSquare } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  loading: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmVariant = "default",
  loading,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const confirmClass = confirmVariant === "destructive"
    ? "bg-red-600 hover:bg-red-700 text-white"
    : "bg-emerald-600 hover:bg-emerald-700 text-white";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogContent showCloseButton={false} className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-background p-6 shadow-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {children && <div className="mt-4">{children}</div>}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 transition-colors disabled:opacity-50 ${confirmClass}`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  onConfirm: (reason: string) => void;
}

export function RejectDialog({ open, onOpenChange, loading, onConfirm }: RejectDialogProps) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setReason(""); }}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogContent showCloseButton={false} className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-background p-6 shadow-lg">
          <DialogHeader>
            <DialogTitle>Recusar orcamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja recusar este orcamento? Opcionalmente, informe um motivo.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            <label htmlFor="reject-reason" className="text-sm font-medium text-foreground">
              Motivo (opcional)
            </label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="Ex: Valor acima do orcamento"
              maxLength={500}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">{reason.length}/500 caracteres</p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => { onOpenChange(false); setReason(""); }}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onConfirm(reason.trim())}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recusando...
                </>
              ) : (
                "Recusar orcamento"
              )}
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
