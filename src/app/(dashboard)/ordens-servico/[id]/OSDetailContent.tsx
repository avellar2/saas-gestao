"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ServiceOrderForm,
  type ServiceOrderFormData,
} from "@/components/modules/service-order-form";
import { CloseServiceOrderDialog } from "@/components/modules/close-service-order-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  buildWhatsAppLink,
  serviceOrderFinishedMessage,
  serviceOrderDeliveredMessage,
} from "@/lib/whatsapp";
import {
  MessageCircle,
  FileDown,
  PackageCheck,
  ExternalLink,
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  User,
  Calendar,
  DollarSign,
  AlertTriangle,
  Info,
  ChevronRight,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { EmptyState } from "@/components/empty-state";
import { StatusPill } from "@/components/layout/status-badge";
import {
  ActionBar,
  type ActionItem,
} from "@/components/layout/action-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getStatusLabel,
  getPaymentStatusLabel,
  getPaymentMethodLabel,
  getWarrantyStatus,
  SERVICE_ORDER_PRIORITY,
  PAYMENT_METHOD,
  STATUS_TRANSITIONS,
  ALLOWED_CLOSE_TRANSITIONS,
} from "@/lib/os-status";

interface ServiceOrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  productId?: string | null;
  product?: { id: string; name: string; quantity: number } | null;
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

interface TechnicianDetail {
  id: string;
  name: string;
}

interface StockMovementDetail {
  id: string;
  productId: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  createdAt: string;
  product: { id: string; name: string };
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
  technician: TechnicianDetail | null;
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
  inventoryDeductedAt?: string | null;
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
  publicToken: string | null;
  financeActive?: boolean;
  inventoryActive?: boolean;
  stockMovements?: StockMovementDetail[];
  transactions?: {
    id: string;
    type: string;
    description: string;
    category: string | null;
    amount: number;
    dueDate: string | null;
    paidAt: string | null;
    status: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
}

interface CustomerOption {
  id: string;
  name: string;
}

interface QuoteOption {
  id: string;
  number: number;
  customerName: string;
}

interface ProductOption {
  id: string;
  name: string;
  salePrice: number;
  quantity: number;
}


export default function OSDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [so, setSo] = useState<ServiceOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [copiedPortal, setCopiedPortal] = useState(false);

  async function loadServiceOrder() {
    try {
      const res = await fetch(`/api/ordens-servico/${id}`);
      if (!res.ok) {
        setError("Ordem de servico nao encontrada");
        return;
      }
      const data = await res.json();
      setSo(data);
    } catch {
      setError("Erro ao carregar ordem de servico");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServiceOrder();
  }, [id]);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch("/api/clientes?limit=100");
        if (res.ok) {
          const data = await res.json();
          setCustomers(
            (data.customers || []).map((c: { id: string; name: string }) => ({
              id: c.id,
              name: c.name,
            }))
          );
        }
      } catch {
        // silently fail
      }
    }
    loadCustomers();
  }, []);

  useEffect(() => {
    async function loadQuotes() {
      try {
        const res = await fetch("/api/orcamentos?status=APPROVED");
        if (res.ok) {
          const data = await res.json();
          setQuotes(
            (Array.isArray(data) ? data : []).map(
              (q: { id: string; number: number; customer: { name: string } }) => ({
                id: q.id,
                number: q.number,
                customerName: q.customer.name,
              })
            )
          );
        }
      } catch {
        // silently fail
      }
    }
    loadQuotes();
  }, []);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("/api/estoque?limit=500");
        if (res.ok) {
          const data = await res.json();
          setProducts(
            (data.products || []).map(
              (p: { id: string; name: string; salePrice: number; quantity: number }) => ({
                id: p.id,
                name: p.name,
                salePrice: p.salePrice,
                quantity: p.quantity,
              })
            )
          );
        }
      } catch {
        // silently fail
      }
    }
    loadProducts();
  }, []);

  function getAvailableTransitions(): string[] {
    if (!so) return [];
    return STATUS_TRANSITIONS[so.status as keyof typeof STATUS_TRANSITIONS] || [];
  }

  async function handleStatusChange(newStatus: string) {
    if (!so) return;
    setError(null);

    const res = await fetch(`/api/ordens-servico/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      let errorMsg = "Erro ao atualizar status";
      try { const body = await res.json(); errorMsg = body.error || errorMsg; } catch {}
      setError(errorMsg);
      return;
    }

    const updated = await res.json();
    setSo({ ...so, ...updated });
  }

  async function handlePayment() {
    if (!so) return;
    setError(null);

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Valor do pagamento invalido");
      return;
    }

    const res = await fetch(`/api/ordens-servico/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentAmount: amount }),
    });

    if (!res.ok) {
      let errorMsg = "Erro ao registrar pagamento";
      try { const body = await res.json(); errorMsg = body.error || errorMsg; } catch {}
      setError(errorMsg);
      return;
    }

    const updated = await res.json();
    setSo({ ...so, ...updated });
    setPaymentAmount("");
    setShowPayment(false);
  }

  async function handleUpdate(data: ServiceOrderFormData) {
    setError(null);
    const res = await fetch(`/api/ordens-servico/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      let errorMsg = "Erro ao atualizar ordem de servico";
      try {
        const body = await res.json();
        errorMsg = body.error || errorMsg;
      } catch {}
      setError(errorMsg);
      return;
    }

    const updated = await res.json();
    setSo({ ...so!, ...updated });
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir esta ordem de servico?")) return;

    const res = await fetch(`/api/ordens-servico/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      let errorMsg = "Erro ao excluir ordem de servico";
      try { const body = await res.json(); errorMsg = body.error || errorMsg; } catch {}
      setError(errorMsg);
      return;
    }
    router.push("/ordens-servico");
    router.refresh();
  }

  function getWhatsAppLinkFinished(): string | null {
    if (!so) return null;
    const phone = so.customer.whatsapp || so.customer.phone;
    if (!phone) return null;
    return buildWhatsAppLink(
      phone,
      serviceOrderFinishedMessage(
        so.customer.name,
        so.number,
        Number(so.total),
        ""
      )
    );
  }

  function getWhatsAppLinkDelivered(): string | null {
    if (!so) return null;
    const phone = so.customer.whatsapp || so.customer.phone;
    if (!phone) return null;
    return buildWhatsAppLink(
      phone,
      serviceOrderDeliveredMessage(so.customer.name, so.number, "")
    );
  }

  const itemsWithProduct = so?.items.filter((item) => item.productId) || [];
  const hasStockDeducted = !!so?.inventoryDeductedAt;
  const stockMovements = so?.stockMovements || [];

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!so) {
    return (
      <EmptyState
        title="Ordem nao encontrada"
        description={error || "A ordem de servico solicitada nao existe ou foi removida."}
        actionLabel="Voltar para Ordens"
        actionHref="/ordens-servico"
      />
    );
  }

  const canEdit = ["RECEIVED", "DIAGNOSIS", "WAITING_APPROVAL", "IN_PROGRESS", "WAITING_PARTS"].includes(so.status);
  const canDelete = so.status === "RECEIVED";
  const transitions = getAvailableTransitions();
  const priorityInfo = SERVICE_ORDER_PRIORITY.find(p => p.value === so.priority);
  const warrantyInfo = getWarrantyStatus(so.warrantyEnabled, so.warrantyEndDate ? new Date(so.warrantyEndDate) : null);

  const primaryActions: ActionItem[] = [];
  const secondaryActions: ActionItem[] = [];

  const canClose = ["IN_PROGRESS", "READY", "DELIVERED"].includes(so.status);
  if (canClose && !editing) {
    primaryActions.push({
      key: "close",
      label: "Finalizar OS",
      variant: "default",
      onClick: () => setCloseDialogOpen(true),
    });
  }

  if (so.status === "READY" && getWhatsAppLinkFinished()) {
    primaryActions.push({
      key: "wpp-ready",
      label: "WhatsApp",
      icon: MessageCircle,
      variant: "default",
      href: getWhatsAppLinkFinished()!,
      external: true,
    });
  }
  if (so.status === "DELIVERED" && getWhatsAppLinkDelivered()) {
    primaryActions.push({
      key: "wpp-delivered",
      label: "WhatsApp",
      icon: MessageCircle,
      variant: "default",
      href: getWhatsAppLinkDelivered()!,
      external: true,
    });
  }

  if (canEdit && !editing) {
    secondaryActions.push({
      key: "edit",
      label: "Editar",
      icon: Edit,
      variant: "outline",
      onClick: () => setEditing(true),
    });
  }

  const closeTransitions = ALLOWED_CLOSE_TRANSITIONS[so.status] || [];
  transitions.forEach((nextStatus) => {
    if (nextStatus === "CANCELLED") return;
    if (closeTransitions.includes(nextStatus)) return;
    const label = getStatusLabel(nextStatus as any);
    secondaryActions.push({
      key: nextStatus,
      label,
      variant: "outline",
      onClick: () => handleStatusChange(nextStatus),
    });
  });

  if (transitions.includes("CANCELLED" as never) && so.status !== "CANCELLED") {
    secondaryActions.push({
      key: "cancel",
      label: "Cancelar",
      variant: "destructive",
      onClick: () => handleStatusChange("CANCELLED"),
    });
  }

  const portalUrl = so.publicToken
    ? `${window.location.origin}/portal/os/${so.publicToken}`
    : null;
  secondaryActions.push({
    key: "portal",
    label: so.publicToken ? "Link do Portal" : "Gerar Link do Portal",
    icon: ExternalLink,
    variant: "outline",
    onClick: async () => {
      if (so.publicToken) {
        navigator.clipboard.writeText(portalUrl!);
        setCopiedPortal(true);
        setTimeout(() => setCopiedPortal(false), 2000);
      } else {
        try {
          const res = await fetch(`/api/ordens-servico/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ generatePublicToken: true }),
          });
          if (res.ok) {
            const updated = await res.json();
            setSo({ ...so, publicToken: updated.publicToken });
          }
        } catch {}
      }
    },
  });

  secondaryActions.push({
    key: "pdf",
    label: "Baixar PDF",
    icon: FileDown,
    variant: "outline",
    href: `/api/pdf/os/${id}`,
    external: true,
  });

  if (canDelete && !editing) {
    secondaryActions.push({
      key: "delete",
      label: "Excluir",
      icon: Trash2,
      variant: "destructive",
      onClick: handleDelete,
    });
  }

  secondaryActions.push({
    key: "back",
    label: "Voltar",
    icon: ArrowLeft,
    variant: "ghost",
    onClick: () => router.push("/ordens-servico"),
  });

  return (
    <div
      className="max-w-[1400px] mx-auto space-y-5"
    >
      {/* Error Banner */}
      {error && (
        <div
          className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm"
        >
          {error}
        </div>
      )}

      {/* ZONA 1: Hero Premium */}
      <div>
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
              {/* Left: identity */}
              <div className="space-y-4 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[2.5rem] font-extrabold tracking-tight text-foreground tabular-nums leading-none">
                    {so.code || `OS #${so.number}`}
                  </h1>
                  <div className="flex items-center gap-2">
                    <StatusPill kind="serviceOrder" value={so.status} />
                    {priorityInfo && (
                      <StatusPill kind="serviceOrderPriority" value={so.priority} />
                    )}
                    <StatusPill kind="payment" value={so.paymentStatus} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-base">
                    <User className="w-4 h-4 text-muted-foreground/60" />
                    <span className="text-muted-foreground">{so.customer.name}</span>
                    {so.customer.phone && (
                      <>
                        <span className="text-muted-foreground/40">|</span>
                        <span className="text-base text-muted-foreground tabular-nums">{so.customer.phone}</span>
                      </>
                    )}
                  </div>
                  {so.equipmentName && (
                    <div className="flex items-center gap-2 text-base">
                      <span className="text-muted-foreground/60 font-medium">Equipamento:</span>
                      <span className="text-foreground font-medium">{so.equipmentName}</span>
                      {so.equipmentBrand && (
                        <span className="text-muted-foreground">{so.equipmentBrand}</span>
                      )}
                      {so.equipmentModel && (
                        <span className="text-muted-foreground/60">({so.equipmentModel})</span>
                      )}
                    </div>
                  )}
                  {so.customer.email && (
                    <div className="flex items-center gap-2 text-base text-muted-foreground">
                      {so.customer.email}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/50" />
                    <span>Entrada: {formatDate(so.receivedAt || so.openedAt)}</span>
                  </div>
                  {so.expectedDeliveryDate && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />
                      <span>Previsão: {formatDate(so.expectedDeliveryDate)}</span>
                    </div>
                  )}
                  {so.completedAt && (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Concluída: {formatDate(so.completedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: value + actions */}
              <div className="flex flex-col items-start lg:items-end gap-4">
                <div className="text-left lg:text-right">
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Valor Total
                  </div>
                  <div className="text-4xl font-extrabold tracking-tight text-foreground tabular-nums mt-1">
                    {formatCurrency(so.finalAmount !== null && so.finalAmount !== undefined ? Number(so.finalAmount) : Number(so.total))}
                  </div>
                </div>
                <ActionBar
                  primaryActions={primaryActions}
                  secondaryActions={secondaryActions}
                  align="right"
                />
              </div>
            </div>
          </div>

          {so.technician && (
            <div className="px-6 py-2.5 border-t border-border/40 bg-muted/20 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Técnico:</span>
              <span>{so.technician.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Edit Mode */}
      {editing && canEdit ? (
        <div>
          <ServiceOrderForm
            customers={customers}
            quotes={quotes}
            products={products}
            inventoryActive={so.inventoryActive}
            initialData={{
              customerId: so.customerId,
              quoteId: so.quoteId || "",
              problemDescription: so.problemDescription || "",
              serviceDescription: so.serviceDescription || "",
              equipmentName: so.equipmentName || "",
              equipmentBrand: so.equipmentBrand || "",
              equipmentModel: so.equipmentModel || "",
              serialNumber: so.serialNumber || "",
              accessories: so.accessories || "",
              priority: so.priority,
              expectedDeliveryDate: so.expectedDeliveryDate ? so.expectedDeliveryDate.split("T")[0] : "",
              warrantyEnabled: so.warrantyEnabled,
              warrantyTerms: so.warrantyTerms || "",
              internalNotes: so.internalNotes || "",
              customerNotes: so.customerNotes || "",
              notes: so.notes || "",
              items: so.items.map((item) => ({
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                productId: item.productId || undefined,
              })),
            }}
            onSubmit={handleUpdate}
            submitLabel="Salvar Alteracoes"
            paymentStatus={so.paymentStatus}
            paymentMethod={so.paymentMethod || undefined}
            paidAmount={Number(so.paidAmount)}
            total={Number(so.total)}
            warrantyEnabled={so.warrantyEnabled}
            warrantyEndDate={so.warrantyEndDate}
          />
        </div>
      ) : (
        <>
          {/* ZONA 2: Atendimento */}
          {(so.problemDescription || so.serviceDescription || so.customerNotes) && (
            <div>
              <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 dark:border-t-emerald-500/20 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="px-6 py-5 border-b border-border/40 bg-emerald-50/40 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Atendimento</h3>
                      <p className="text-base text-muted-foreground">Problema, diagnóstico e observações</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  {so.problemDescription && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-base font-semibold uppercase tracking-wider text-foreground">Problema Relatado</span>
                      </div>
                      <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {so.problemDescription}
                      </p>
                    </div>
                  )}
                  {so.serviceDescription && (
                    <div className={so.problemDescription ? "pt-4 border-t border-border/30" : ""}>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-base font-semibold uppercase tracking-wider text-foreground">Serviço Realizado</span>
                      </div>
                      <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {so.serviceDescription}
                      </p>
                    </div>
                  )}
                  {so.customerNotes && (
                    <div className={so.problemDescription || so.serviceDescription ? "pt-4 border-t border-border/30" : ""}>
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-blue-500" />
                        <span className="text-base font-semibold uppercase tracking-wider text-foreground">Observações para o Cliente</span>
                      </div>
                      <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {so.customerNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ZONA 3: Operacional / Comercial */}
          <div>
            <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 dark:border-t-emerald-500/20 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="px-6 py-5 border-b border-border/40 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Itens e Pagamento</h3>
                    <p className="text-base text-muted-foreground">Produtos, serviços e financeiro</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Itens */}
                <div>
                  <h4 className="text-base font-semibold uppercase tracking-wider text-foreground mb-3">Itens da OS</h4>
                  <div className="rounded-xl border border-border/40 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/25 hover:bg-muted/25 border-b border-border/40">
                          <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Descrição</TableHead>
                          <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-center w-16">Qtd</TableHead>
                          <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right w-24">Unitário</TableHead>
                          <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right w-24">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {so.items.map((item) => (
                          <TableRow key={item.id} className="border-b border-border/20 last:border-0 hover:bg-muted/15 transition-colors duration-150">
                            <TableCell className="py-3 px-4 text-base text-foreground">
                              {item.description}
                              {item.product && (
                                <span className="ml-2 text-sm text-muted-foreground">
                                  ({item.product.name})
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center text-base text-muted-foreground tabular-nums">{Number(item.quantity)}</TableCell>
                            <TableCell className="py-3 px-4 text-right text-base text-muted-foreground tabular-nums">{formatCurrency(Number(item.unitPrice))}</TableCell>
                            <TableCell className="py-3 px-4 text-right text-base font-semibold text-foreground tabular-nums">{formatCurrency(Number(item.total))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end pt-3">
                    <div className="flex items-center gap-3">
                      <span className="text-base text-muted-foreground">Total:</span>
                      <span className="text-2xl font-extrabold text-foreground tabular-nums">{formatCurrency(Number(so.total))}</span>
                    </div>
                  </div>
                </div>

                {/* Pagamento */}
                <div className="pt-4 border-t border-border/30">
                  <h4 className="text-base font-semibold uppercase tracking-wider text-foreground mb-3">Pagamento</h4>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <StatusPill kind="payment" value={so.paymentStatus} />
                    {so.paymentMethod && (
                      <span className="text-base text-muted-foreground">{getPaymentMethodLabel(so.paymentMethod as any)}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 max-w-md">
                    <div>
                      <div className="text-sm text-muted-foreground mb-0.5">Total</div>
                      <div className="text-base font-semibold text-foreground tabular-nums">{formatCurrency(Number(so.total))}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-0.5">Pago</div>
                      <div className="text-base font-semibold text-emerald-600 tabular-nums">{formatCurrency(Number(so.paidAmount))}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-0.5">Restante</div>
                      <div className="text-base font-semibold text-foreground tabular-nums">{formatCurrency(Number(so.total) - Number(so.paidAmount))}</div>
                    </div>
                  </div>

                  {so.status !== "CANCELLED" && so.paymentStatus === "PENDING" && !showPayment && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPayment(true)}
                      className="gap-1.5 mt-4 h-9 rounded-lg active:scale-[0.97] transition-transform"
                    >
                      <DollarSign className="h-4 w-4" />
                      Registrar Pagamento
                    </Button>
                  )}

                  {showPayment && (
                    <div className="flex items-end gap-3 pt-3">
                      <div className="space-y-2 flex-1 max-w-xs">
                        <Label htmlFor="paymentAmount" className="text-sm">Valor do Pagamento</Label>
                        <Input
                          id="paymentAmount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="0.00"
                          className="h-9 rounded-lg"
                        />
                      </div>
                      <Button onClick={handlePayment} size="sm" className="h-9 rounded-lg active:scale-[0.97] transition-transform">Registrar</Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowPayment(false);
                          setPaymentAmount("");
                        }}
                        className="h-9 rounded-lg active:scale-[0.97] transition-transform"
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>

                {/* Financeiro */}
                {so.status !== "CANCELLED" && !so.financeActive && (
                  <div className="pt-4 border-t border-border/30 flex items-center gap-2 text-base text-muted-foreground">
                    <Info className="w-4 h-4" />
                    <p>Ative o módulo Financeiro para lançar receitas automaticamente.</p>
                  </div>
                )}
                {so.financeActive && so.transactions && so.transactions.length > 0 && (
                  <div className="pt-4 border-t border-border/30">
                    <h4 className="text-base font-semibold uppercase tracking-wider text-foreground mb-3">Lançamento Financeiro</h4>
                    <div className="flex flex-wrap items-center gap-3 text-base">
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-semibold tabular-nums">{formatCurrency(so.transactions[0].amount)}</span>
                      {(() => {
                        const s = so.transactions[0].status;
                        const colors: Record<string, string> = {
                          PENDING: "bg-amber-50 text-amber-700 border-amber-200",
                          PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
                          OVERDUE: "bg-red-50 text-red-700 border-red-200",
                          CANCELLED: "bg-muted text-muted-foreground border-border",
                        };
                        const labels: Record<string, string> = {
                          PENDING: "Pendente",
                          PAID: "Pago",
                          OVERDUE: "Vencido",
                          CANCELLED: "Cancelado",
                        };
                        return (
                          <Badge variant="outline" className={cn("rounded-md px-2 py-0.5 text-xs font-medium", colors[s] || "")}>
                            {labels[s] || s}
                          </Badge>
                        );
                      })()}
                      {so.transactions[0].paidAt && (
                        <>
                          <span className="text-muted-foreground">Pago em:</span>
                          <span>{formatDate(so.transactions[0].paidAt)}</span>
                        </>
                      )}
                      {so.transactions[0].dueDate && !so.transactions[0].paidAt && (
                        <>
                          <span className="text-muted-foreground">Vencimento:</span>
                          <span>{formatDate(so.transactions[0].dueDate)}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-3">
                      <Link
                        href={`/financeiro/${so.transactions[0].id}`}
                        className="text-base text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-0.5 hover:gap-1 transition-all"
                      >
                        Ver no Financeiro
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* Estoque */}
                {so.inventoryActive && itemsWithProduct.length > 0 && (
                  <div className="pt-4 border-t border-border/30">
                    <h4 className="text-base font-semibold uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
                      <PackageCheck className="w-4 h-4 text-emerald-600" />
                      Estoque
                    </h4>
                    {hasStockDeducted ? (
                      <>
                        <p className="text-base text-emerald-700 dark:text-emerald-400 font-medium mb-3">
                          Produtos baixados do estoque em {so.inventoryDeductedAt ? formatDate(so.inventoryDeductedAt) : "—"}
                        </p>
                        <div className="space-y-2">
                          {stockMovements.map((sm) => (
                            <div
                              key={sm.id}
                              className="flex items-center justify-between text-base border-b border-border/20 pb-2 last:border-0 last:pb-0"
                            >
                              <span className="font-medium text-foreground">{sm.product.name}</span>
                              <div className="flex items-center gap-4 text-muted-foreground tabular-nums">
                                <span>Qtd: {sm.quantity}</span>
                                <span>{sm.previousQuantity} → {sm.newQuantity}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-base text-muted-foreground mb-3">
                          O estoque sera baixado automaticamente ao finalizar a Ordem de Servico.
                        </p>
                        <div className="space-y-2 text-sm">
                          {itemsWithProduct.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0"
                            >
                              <span className="font-medium text-foreground">{item.product?.name || item.description}</span>
                              <div className="flex items-center gap-4 text-muted-foreground tabular-nums">
                                <span>Qtd: {Number(item.quantity)}</span>
                                {item.product && (
                                  <span>Disponivel: {Number(item.product.quantity)}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ZONA 4: Pós-venda */}
          {(so.warrantyEnabled || so.internalNotes || so.notes) && (
            <div>
              <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 dark:border-t-emerald-500/20 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="px-6 py-5 border-b border-border/40 bg-emerald-50/40 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Pós-venda</h3>
                      <p className="text-base text-muted-foreground">Garantia e observações finais</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Garantia */}
                  {so.warrantyEnabled && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-base font-semibold uppercase tracking-wider text-foreground">Garantia</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("rounded-md px-2 py-0.5 text-xs font-medium", warrantyInfo.variant)}>
                            {warrantyInfo.label}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-base text-muted-foreground pt-1">
                          {so.warrantyStartDate && (
                            <div>
                              <span className="font-medium text-foreground">Início:</span>{" "}
                              <span>{formatDate(so.warrantyStartDate)}</span>
                            </div>
                          )}
                          {so.warrantyEndDate && (
                            <div>
                              <span className="font-medium text-foreground">Validade:</span>{" "}
                              <span>{formatDate(so.warrantyEndDate)}</span>
                            </div>
                          )}
                        </div>
                        {so.warrantyTerms && (
                          <div className="pt-2">
                            <span className="font-medium text-foreground">Termos:</span>
                            <p className="mt-1 whitespace-pre-wrap text-base text-muted-foreground">{so.warrantyTerms}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Observações Internas */}
                  {so.internalNotes && (
                    <div className={so.warrantyEnabled ? "pt-4 border-t border-border/30" : ""}>
                      <h4 className="text-base font-semibold uppercase tracking-wider text-foreground mb-2">Observações Internas</h4>
                      <p className="text-base text-muted-foreground whitespace-pre-wrap">{so.internalNotes}</p>
                    </div>
                  )}

                  {/* Observações Gerais */}
                  {so.notes && (
                    <div className={so.warrantyEnabled || so.internalNotes ? "pt-4 border-t border-border/30" : ""}>
                      <h4 className="text-base font-semibold uppercase tracking-wider text-foreground mb-2">Observações</h4>
                      <p className="text-base text-muted-foreground whitespace-pre-wrap">{so.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Close Dialog */}
      <CloseServiceOrderDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        serviceOrder={so}
        onSuccess={() => {
          loadServiceOrder();
          setCloseDialogOpen(false);
        }}
      />
    </div>
  );
}
