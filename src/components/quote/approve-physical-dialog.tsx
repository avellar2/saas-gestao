"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckSquare, Loader2, XIcon } from "lucide-react";

interface ApprovePhysicalDialogProps {
  quoteId: string;
  onApproved: () => void;
}

export function ApprovePhysicalDialog({ quoteId, onApproved }: ApprovePhysicalDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvedByName, setApprovedByName] = useState("");

  async function handleApprove() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/orcamentos/${quoteId}/approve-physical`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvedByName: approvedByName.trim() || undefined,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Erro ao aprovar");
        return;
      }

      onApproved();
      setOpen(false);
      setApprovedByName("");
    } catch {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium h-9 px-3.5 border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <CheckSquare className="h-4 w-4" />
        Aprovar presencialmente
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogContent showCloseButton={false} className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-background p-6 shadow-lg">
          <DialogHeader>
            <DialogTitle>Aprovar Presencialmente</DialogTitle>
            <DialogDescription>
              Confirme a aprovacao deste orcamento de forma presencial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="approvedByName">
                Nome de quem aprovou (opcional)
              </Label>
              <Input
                id="approvedByName"
                value={approvedByName}
                onChange={(e) => setApprovedByName(e.target.value)}
                placeholder="Ex: Joao da Silva"
                maxLength={200}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive p-3 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={handleApprove} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aprovando...
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Confirmar Aprovacao
                  </>
                )}
              </Button>
              <DialogClose
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Cancelar
              </DialogClose>
            </div>
          </div>

          <DialogClose
            className="absolute right-4 top-4 inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
            aria-label="Fechar"
          >
            <XIcon className="h-4 w-4" />
          </DialogClose>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
