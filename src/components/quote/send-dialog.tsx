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
import { Send, MessageCircle, Mail, FileText, Loader2, Copy, Check, XIcon } from "lucide-react";

interface SendDialogProps {
  quoteId: string;
  customerName: string;
  customerPhone: string | null;
  customerWhatsapp: string | null;
  customerEmail: string | null;
  isSent: boolean;
  onSent: () => void;
}

export function SendDialog({
  quoteId,
  customerName,
  customerPhone,
  customerWhatsapp,
  customerEmail,
  isSent,
  onSent,
}: SendDialogProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const hasPhone = !!(customerWhatsapp || customerPhone);
  const hasEmail = !!customerEmail;

  async function handleSend(channel: "EMAIL" | "WHATSAPP" | "MANUAL") {
    setSending(channel);
    setError(null);
    setSuccess(null);
    setWhatsappLink(null);

    try {
      const res = await fetch(`/api/orcamentos/${quoteId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });

      // Check if response is JSON before parsing
      const contentType = res.headers.get("content-type") || "";
      let body: Record<string, unknown> = {};
      if (contentType.includes("application/json")) {
        const text = await res.text();
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            body = { error: `Resposta invalida do servidor (status ${res.status})` };
          }
        }
      } else {
        body = { error: `Erro ${res.status}: servidor retornou resposta nao-JSON` };
      }

      if (!res.ok) {
        setError((body.error as string) || `Erro ${res.status} ao enviar`);
        return;
      }

      // Open WhatsApp link in new tab if present
      if (body.whatsappLink) {
        setWhatsappLink(body.whatsappLink as string);
        window.open(body.whatsappLink as string, "_blank", "noopener,noreferrer");
      }

      // Show success message
      setSuccess(
        channel === "EMAIL"
          ? "E-mail enviado com sucesso!"
          : channel === "WHATSAPP"
          ? "Link do WhatsApp aberto! Confirme o envio na nova aba."
          : "Marcado como enviado com sucesso!"
      );

      onSent();

      // Auto-close dialog after 2s for MANUAL and EMAIL (not WhatsApp since user needs to confirm)
      if (channel !== "WHATSAPP") {
        setTimeout(() => {
          setOpen(false);
          setSuccess(null);
        }, 2000);
      }
    } catch (err) {
      console.error("Send error:", err);
      setError("Erro de conexao. Verifique sua internet e tente novamente.");
    } finally {
      setSending(null);
    }
  }

  async function handleCopyLink() {
    if (whatsappLink) {
      await navigator.clipboard.writeText(whatsappLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
      >
        <Send className="h-4 w-4" />
        {isSent ? "Reenviar" : "Enviar"}
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogContent showCloseButton={false} className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-background p-6 shadow-lg">
          <DialogHeader>
            <DialogTitle>Enviar Orcamento</DialogTitle>
            <DialogDescription>
              Escolha como enviar o orcamento para <strong>{customerName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Customer info */}
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              {hasPhone && (
                <p className="text-muted-foreground">
                  <span className="font-medium">Telefone:</span> {customerWhatsapp || customerPhone}
                </p>
              )}
              {hasEmail && (
                <p className="text-muted-foreground">
                  <span className="font-medium">E-mail:</span> {customerEmail}
                </p>
              )}
              {!hasPhone && !hasEmail && (
                <p className="text-destructive text-xs">Cliente sem telefone ou e-mail cadastrado</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive p-3 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm font-medium">
                {success}
              </div>
            )}

            {/* WhatsApp */}
            <Button
              onClick={() => handleSend("WHATSAPP")}
              disabled={sending !== null || !hasPhone}
              className="w-full justify-start h-auto py-3 px-4 bg-green-600 hover:bg-green-700 text-white"
            >
              <MessageCircle className="h-5 w-5 mr-3 shrink-0" />
              <div className="text-left">
                <p className="font-semibold text-sm">WhatsApp</p>
                <p className="text-xs opacity-80">
                  {!hasPhone ? "Cliente sem telefone" : "Abrir WhatsApp com mensagem"}
                </p>
              </div>
            </Button>

            {/* Email */}
            <Button
              onClick={() => handleSend("EMAIL")}
              disabled={sending !== null || !hasEmail}
              variant="outline"
              className="w-full justify-start h-auto py-3 px-4"
            >
              <Mail className="h-5 w-5 mr-3 shrink-0" />
              <div className="text-left">
                <p className="font-semibold text-sm">E-mail</p>
                <p className="text-xs text-muted-foreground">
                  {!hasEmail ? "Cliente sem e-mail" : "Enviar por e-mail via Resend"}
                </p>
              </div>
            </Button>

            {/* Manual */}
            <Button
              onClick={() => handleSend("MANUAL")}
              disabled={sending !== null}
              variant="outline"
              className="w-full justify-start h-auto py-3 px-4"
            >
              <FileText className="h-5 w-5 mr-3 shrink-0" />
              <div className="text-left">
                <p className="font-semibold text-sm">Apenas marcar como enviado</p>
                <p className="text-xs text-muted-foreground">
                  Para entregas impressas ou presenciais
                </p>
              </div>
            </Button>

            {/* WhatsApp link result */}
            {whatsappLink && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-2">
                <p className="text-xs text-green-700 font-medium">WhatsApp aberto! Copie o link se precisar:</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={whatsappLink}
                    className="flex-1 text-xs bg-white border rounded px-2 py-1 text-muted-foreground truncate"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Loading state */}
            {sending && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando por {sending === "EMAIL" ? "e-mail" : sending === "WHATSAPP" ? "WhatsApp" : "manual"}...
              </div>
            )}
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
