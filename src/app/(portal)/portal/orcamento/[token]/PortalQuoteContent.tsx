"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileDown, CheckCircle, XCircle, Phone, Mail, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PortalQuote } from "@/lib/quote-portal";
import { ConfirmDialog, RejectDialog } from "./PortalDialogs";

interface PortalQuoteContentProps {
  data: PortalQuote;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "DRAFT": return "Rascunho";
    case "SENT": return "Enviado";
    case "APPROVED": return "Aprovado";
    case "REJECTED": return "Rejeitado";
    case "EXPIRED": return "Expirado";
    default: return status;
  }
}

function getStatusVariant(status: string): string {
  switch (status) {
    case "APPROVED": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "SENT": return "bg-blue-50 text-blue-700 border-blue-200";
    case "REJECTED": return "bg-red-50 text-red-700 border-red-200";
    case "EXPIRED": return "bg-amber-50 text-amber-700 border-amber-200";
    default: return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

export function PortalQuoteContent({ data }: PortalQuoteContentProps) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const isFinal = data.status === "APPROVED" || data.status === "REJECTED" || data.status === "EXPIRED";
  const canApprove = data.status === "SENT";
  const canReject = data.status === "SENT";

  const isExpired = data.validUntil ? new Date() > new Date(data.validUntil) : false;

  async function doApprove() {
    setApproving(true);
    setError(null);

    try {
      const res = await fetch(`/api/public/orcamentos/${data.publicToken}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Erro ao aprovar orcamento");
        return;
      }

      setSuccess("Orcamento aprovado com sucesso!");
      setShowApproveDialog(false);
      // Reload after a short delay
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setError("Erro ao aprovar orcamento. Tente novamente.");
    } finally {
      setApproving(false);
    }
  }

  async function doReject(reason: string) {
    setRejecting(true);
    setError(null);

    try {
      const res = await fetch(`/api/public/orcamentos/${data.publicToken}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Erro ao recusar orcamento");
        return;
      }

      setSuccess("Orcamento recusado.");
      setShowRejectDialog(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setError("Erro ao recusar orcamento. Tente novamente.");
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Success/Error messages */}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 p-4 text-sm text-center">
            {success}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-4 text-sm text-center">
            {error}
          </div>
        )}

        {/* Header Card */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
                  {data.companyName}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {data.companyPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {data.companyPhone}
                    </span>
                  )}
                  {data.companyEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {data.companyEmail}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2">
                <Badge variant="outline" className={getStatusVariant(data.status)}>
                  {getStatusLabel(data.status)}
                </Badge>
                <span className="text-2xl font-bold text-foreground">
                  #{String(data.number).padStart(4, "0")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quote Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Informacoes do Orcamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Cliente</p>
                <p className="font-medium text-foreground">{data.customerName}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Data de emissao</p>
                <p className="font-medium text-foreground">{formatDate(data.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Validade</p>
                <p className={`font-medium ${isExpired ? "text-destructive" : "text-foreground"}`}>
                  {data.validUntil ? formatDate(data.validUntil) : "Nao definida"}
                  {isExpired && " (Expirado)"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Total</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(data.total)}</p>
              </div>
            </div>

            {data.description && (
              <div className="mt-4">
                <p className="text-muted-foreground mb-1 text-sm">Descricao</p>
                <p className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
                  {data.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items */}
        {data.items.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Itens e Servicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Descricao</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground w-16">Qtd</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">Unitario</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2 text-foreground">{item.description}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right text-foreground font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end space-y-1">
                <div className="text-right space-y-1">
                  <div className="text-sm text-muted-foreground">
                    Subtotal: <span className="font-medium text-foreground">{formatCurrency(data.subtotal)}</span>
                  </div>
                  {data.discount > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Desconto: <span className="font-medium text-red-600">-{formatCurrency(data.discount)}</span>
                    </div>
                  )}
                  <div className="text-lg font-bold text-foreground pt-1 border-t">
                    Total: <span className="text-primary">{formatCurrency(data.total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {data.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Observacoes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{data.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {!isFinal && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={`/api/public/orcamentos/${data.publicToken}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted flex-1"
                >
                  <FileDown className="h-4 w-4" />
                  Baixar PDF
                </a>
                {canApprove && (
                  <button
                    onClick={() => setShowApproveDialog(true)}
                    disabled={isExpired}
                    className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Aprovar Orcamento
                  </button>
                )}
                {canReject && (
                  <button
                    onClick={() => setShowRejectDialog(true)}
                    disabled={rejecting}
                    className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-destructive/30 text-sm font-medium h-11 px-4 text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                    Recusar
                  </button>
                )}
              </div>
              {isExpired && canApprove && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Este orcamento esta fora do prazo de validade e nao pode ser aprovado.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Final status message */}
        {isFinal && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  {data.status === "APPROVED" && "Este orcamento foi aprovado."}
                  {data.status === "REJECTED" && "Este orcamento foi rejeitado."}
                  {data.status === "EXPIRED" && "Este orcamento expirou."}
                </p>
                {data.status === "APPROVED" && data.approvedAt && (
                  <p className="text-xs text-muted-foreground">
                    Aprovado em {formatDate(data.approvedAt)}
                    {data.approvalSource === "ONLINE" ? " (online)" : " (presencial)"}
                  </p>
                )}
                {data.status === "REJECTED" && data.rejectedAt && (
                  <p className="text-xs text-muted-foreground">
                    Rejeitado em {formatDate(data.rejectedAt)}
                    {data.rejectionReason && `: ${data.rejectionReason}`}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          <p>{data.companyName} — Powered by AVGESTAO</p>
        </div>
      </div>

      {/* Approve Confirmation Dialog */}
      <ConfirmDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        title="Aprovar orcamento"
        description="Tem certeza que deseja aprovar este orcamento? Esta acao nao pode ser desfeita."
        confirmLabel="Sim, aprovar"
        confirmVariant="default"
        loading={approving}
        onConfirm={doApprove}
      />

      {/* Reject Dialog */}
      <RejectDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        loading={rejecting}
        onConfirm={doReject}
      />
    </div>
  );
}
