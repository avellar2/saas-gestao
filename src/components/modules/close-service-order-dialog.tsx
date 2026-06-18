"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ALLOWED_CLOSE_TRANSITIONS, getStatusLabel } from "@/lib/os-status";
import { formatCurrency } from "@/lib/utils";

const WARRANTY_DAYS_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "15", label: "15 dias" },
  { value: "30", label: "30 dias" },
  { value: "60", label: "60 dias" },
  { value: "90", label: "90 dias" },
  { value: "custom", label: "Personalizado" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pendente" },
  { value: "PARTIAL", label: "Parcial" },
  { value: "PAID", label: "Pago" },
  { value: "CANCELLED", label: "Cancelado" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "CARD", label: "Cartão" },
  { value: "TRANSFER", label: "Transferência" },
  { value: "OTHER", label: "Outro" },
];

const DEFAULT_WARRANTY_TERMS =
  "Garantia de {days} dias a partir da data de início. A garantia cobre defeitos de fabricação e problemas relacionados ao serviço realizado. Não cobre danos causados por uso inadequado, acidentes ou intervenções de terceiros.";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

interface ServiceOrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface CustomerDetail {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
}

interface LinkedQuote {
  id: string;
  number: number;
  status: string;
  total: number;
}

interface ServiceOrderDetail {
  id: string;
  number: number;
  code: string | null;
  status: string;
  priority: string;
  problemDescription: string | null;
  serviceDescription: string | null;
  equipmentName: string | null;
  equipmentBrand: string | null;
  equipmentModel: string | null;
  serialNumber: string | null;
  accessories: string | null;
  technician: { id: string; name: string } | null;
  total: number;
  finalAmount: number | null;
  paidAmount: number;
  paymentStatus: string;
  paymentMethod: string | null;
  receivedAt: string | null;
  expectedDeliveryDate: string | null;
  completedAt: string | null;
  warrantyEnabled: boolean;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  warrantyTerms: string | null;
  internalNotes: string | null;
  customerNotes: string | null;
  openedAt: string;
  finishedAt: string | null;
  notes: string | null;
  customerId: string;
  quoteId: string | null;
  customer: CustomerDetail;
  quote: LinkedQuote | null;
  items: ServiceOrderItem[];
  createdAt: string;
  updatedAt: string;
}

interface CloseServiceOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceOrder: ServiceOrderDetail;
  onSuccess: (updated: ServiceOrderDetail) => void;
}

export function CloseServiceOrderDialog({
  open,
  onOpenChange,
  serviceOrder,
  onSuccess,
}: CloseServiceOrderDialogProps) {
  const today = formatDateInput(new Date());

  const allowedStatuses = ALLOWED_CLOSE_TRANSITIONS[serviceOrder.status] || [];
  const defaultFinalStatus = allowedStatuses[allowedStatuses.length - 1] || "COMPLETED";

  const [finalStatus, setFinalStatus] = useState(defaultFinalStatus);
  const [finalAmount, setFinalAmount] = useState(
    String(serviceOrder.finalAmount ?? serviceOrder.total)
  );
  const [paymentStatus, setPaymentStatus] = useState(serviceOrder.paymentStatus);
  const [paymentMethod, setPaymentMethod] = useState(serviceOrder.paymentMethod ?? "");
  const [completedAt, setCompletedAt] = useState(today);
  const [serviceDescription, setServiceDescription] = useState(
    serviceOrder.serviceDescription ?? ""
  );
  const [customerNotes, setCustomerNotes] = useState(serviceOrder.customerNotes ?? "");
  const [warrantyEnabled, setWarrantyEnabled] = useState(serviceOrder.warrantyEnabled);
  const [warrantyDays, setWarrantyDays] = useState("30");
  const [warrantyStartDate, setWarrantyStartDate] = useState(
    serviceOrder.warrantyStartDate ?? today
  );
  const [warrantyEndDate, setWarrantyEndDate] = useState(
    serviceOrder.warrantyEndDate ?? formatDateInput(addDays(new Date(), 30))
  );
  const [warrantyTerms, setWarrantyTerms] = useState(
    serviceOrder.warrantyTerms ?? DEFAULT_WARRANTY_TERMS.replace("{days}", "30")
  );
  const [sendEmail, setSendEmail] = useState(!!serviceOrder.customer.email);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens with a new service order
  useEffect(() => {
    if (open) {
      const allowed = ALLOWED_CLOSE_TRANSITIONS[serviceOrder.status] || [];
      setFinalStatus(allowed[allowed.length - 1] || "COMPLETED");
      setFinalAmount(String(serviceOrder.finalAmount ?? serviceOrder.total));
      setPaymentStatus(serviceOrder.paymentStatus);
      setPaymentMethod(serviceOrder.paymentMethod ?? "");
      setCompletedAt(today);
      setServiceDescription(serviceOrder.serviceDescription ?? "");
      setCustomerNotes(serviceOrder.customerNotes ?? "");
      setWarrantyEnabled(serviceOrder.warrantyEnabled);
      setWarrantyDays("30");
      setWarrantyStartDate(serviceOrder.warrantyStartDate ?? today);
      setWarrantyEndDate(
        serviceOrder.warrantyEndDate ?? formatDateInput(addDays(new Date(), 30))
      );
      setWarrantyTerms(
        serviceOrder.warrantyTerms ?? DEFAULT_WARRANTY_TERMS.replace("{days}", "30")
      );
      setSendEmail(!!serviceOrder.customer.email);
      setError(null);
      setSubmitting(false);
    }
  }, [open, serviceOrder]);

  // Auto-calculate warranty end date when warrantyDays or start date changes
  useEffect(() => {
    if (warrantyEnabled && warrantyDays !== "custom") {
      const days = parseInt(warrantyDays, 10);
      if (!isNaN(days)) {
        const start = new Date(warrantyStartDate);
        if (!isNaN(start.getTime())) {
          setWarrantyEndDate(formatDateInput(addDays(start, days)));
          setWarrantyTerms(DEFAULT_WARRANTY_TERMS.replace("{days}", String(days)));
        }
      }
    }
  }, [warrantyDays, warrantyStartDate, warrantyEnabled]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const existingPaid = Number(serviceOrder.paidAmount ?? 0);
    // Se o status final é PARTIAL, o paidAmount = existingPaid (sem novo pagamento agora)
    // Se é PAID, paidAmount = finalAmount (total)
    // Se é PENDING/CANCELLED, paidAmount = existingPaid (sem mudança)
    const newPaidAmount = paymentStatus === "PAID"
      ? parseFloat(finalAmount)
      : paymentStatus === "PARTIAL"
        ? existingPaid
        : existingPaid;

    const payload: Record<string, unknown> = {
      finalStatus,
      finalAmount: parseFloat(finalAmount),
      paidAmount: newPaidAmount,
      existingPaidAmount: existingPaid,
      paymentStatus,
      paymentMethod: paymentStatus === "PENDING" ? null : (paymentMethod || null),
      completedAt,
      serviceDescription,
      customerNotes,
      warrantyEnabled,
      sendEmail,
    };

    if (warrantyEnabled) {
      payload.warrantyStartDate = warrantyStartDate;
      payload.warrantyEndDate = warrantyEndDate;
      payload.warrantyTerms = warrantyTerms;
    }

    try {
      const res = await fetch(`/api/ordens-servico/${serviceOrder.id}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();

      if (!res.ok) {
        if (body.insufficientStock && body.details) {
          const detailMessages = body.details.map(
            (d: { productName: string; available: number; required: number }) =>
              `• "${d.productName}": necessário ${d.required}, disponível ${d.available}`
          );
          setError(
            `Estoque insuficiente para finalizar a OS:\n${detailMessages.join("\n")}\n\nAbasteça o estoque ou remova os itens antes de finalizar.`
          );
        } else {
          setError(body.error || "Erro ao finalizar OS");
        }
        setSubmitting(false);
        return;
      }

      onSuccess(body);
      onOpenChange(false);
    } catch {
      setError("Erro de conexão ao finalizar OS");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton>
        <DialogHeader>
          <DialogTitle>Finalizar Ordem de Serviço</DialogTitle>
          <DialogDescription>
            {serviceOrder.code || `OS-${String(serviceOrder.number).padStart(4, "0")}`
            } &mdash; Status atual: {getStatusLabel(serviceOrder.status as any)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Status Final */}
          <div className="space-y-2">
            <Label htmlFor="finalStatus">Status Final</Label>
            <select
              id="finalStatus"
              value={finalStatus}
              onChange={(e) => setFinalStatus(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-border/60 bg-background px-4 text-base shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-colors"
            >
              {allowedStatuses.map((s) => (
                <option key={s} value={s}>
                  {getStatusLabel(s as any)}
                </option>
              ))}
            </select>
          </div>

          {/* Valores e Pagamento */}
          <div className="space-y-3 rounded-lg border p-4">
            <h4 className="text-sm font-medium text-foreground">Valores e Pagamento</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="finalAmount">Valor Final (R$)</Label>
                <Input
                  id="finalAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={finalAmount}
                  onChange={(e) => setFinalAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="paymentStatus">Status do Pagamento</Label>
                <select
                  id="paymentStatus"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="flex h-12 w-full rounded-xl border border-border/60 bg-background px-4 text-base shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-colors"
                >
                  {PAYMENT_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {paymentStatus !== "PENDING" && (
              <div className="space-y-1.5">
                <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="flex h-12 w-full rounded-xl border border-border/60 bg-background px-4 text-base shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-colors"
                >
                  <option value="">Selecione...</option>
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Serviço */}
          <div className="space-y-3 rounded-lg border p-4">
            <h4 className="text-sm font-medium text-foreground">Serviço</h4>
            <div className="space-y-1.5">
              <Label htmlFor="serviceDescription">Serviço Realizado</Label>
              <Textarea
                id="serviceDescription"
                rows={3}
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                placeholder="Descreva o serviço realizado..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerNotes">Observações para o Cliente</Label>
              <Textarea
                id="customerNotes"
                rows={2}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Informações adicionais para o cliente..."
              />
            </div>
          </div>

          {/* Garantia */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="warrantyEnabled"
                checked={warrantyEnabled}
                onChange={(e) => setWarrantyEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="warrantyEnabled" className="text-sm font-medium">
                Oferecer garantia para este serviço
              </Label>
            </div>

            {warrantyEnabled && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="warrantyDays">Prazo da Garantia</Label>
                  <select
                    id="warrantyDays"
                    value={warrantyDays}
                    onChange={(e) => setWarrantyDays(e.target.value)}
                    className="flex h-12 w-full rounded-xl border border-border/60 bg-background px-4 text-base shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-colors"
                  >
                    {WARRANTY_DAYS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="warrantyStartDate">Início da Garantia</Label>
                    <Input
                      id="warrantyStartDate"
                      type="date"
                      value={warrantyStartDate}
                      onChange={(e) => setWarrantyStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="warrantyEndDate">
                      {warrantyDays === "custom" ? "Fim da Garantia" : "Fim da Garantia (calculado)"}
                    </Label>
                    <Input
                      id="warrantyEndDate"
                      type="date"
                      value={warrantyEndDate}
                      onChange={(e) => setWarrantyEndDate(e.target.value)}
                      readOnly={warrantyDays !== "custom"}
                      className={warrantyDays !== "custom" ? "opacity-70" : ""}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="warrantyTerms">Termos da Garantia</Label>
                  <Textarea
                    id="warrantyTerms"
                    rows={3}
                    value={warrantyTerms}
                    onChange={(e) => setWarrantyTerms(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Data de Conclusão */}
          <div className="space-y-1.5">
            <Label htmlFor="completedAt">Data de Conclusão</Label>
            <Input
              id="completedAt"
              type="date"
              value={completedAt}
              onChange={(e) => setCompletedAt(e.target.value)}
            />
          </div>

          {/* Notificação */}
          {serviceOrder.customer.email && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sendEmail"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="sendEmail" className="text-sm">
                Enviar notificação por e-mail para {serviceOrder.customer.email}
              </Label>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive whitespace-pre-wrap">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Finalizando..." : "Finalizar OS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}