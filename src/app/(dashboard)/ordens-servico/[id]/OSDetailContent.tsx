"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ServiceOrderForm,
  type ServiceOrderFormData,
} from "@/components/modules/service-order-form";
import { CloseServiceOrderDialog } from "@/components/modules/close-service-order-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  buildWhatsAppLink,
  serviceOrderFinishedMessage,
  serviceOrderDeliveredMessage,
} from "@/lib/whatsapp";
import { MessageCircle, FileDown, PackageCheck, ExternalLink, Copy } from "lucide-react";
import Link from "next/link";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  getStatusLabel, getStatusVariant,
  getPriorityLabel, getPriorityVariant,
  getPaymentStatusLabel, getPaymentStatusVariant,
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
        // silently fail — inventory inactive
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

  // ── Estoque helpers ──
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

  // Action buttons based on status
  function renderActionButtons() {
    const buttons: React.ReactNode[] = [];

    if (canEdit && !editing) {
      buttons.push(
        <Button key="edit" variant="outline" onClick={() => setEditing(true)}>
          Editar
        </Button>
      );
    }

    if (canDelete && !editing) {
      buttons.push(
        <Button key="delete" variant="destructive" onClick={handleDelete}>
          Excluir
        </Button>
      );
    }

    // "Finalizar OS" button for close-eligible statuses
    const canClose = ["IN_PROGRESS", "READY", "DELIVERED"].includes(so!.status);
    if (canClose && !editing) {
      buttons.push(
        <Button
          key="close"
          variant="default"
          onClick={() => setCloseDialogOpen(true)}
        >
          Finalizar OS
        </Button>
      );
    }

    // Status transition buttons (exclude transitions handled by close dialog)
    const closeTransitions = ALLOWED_CLOSE_TRANSITIONS[so!.status] || [];
    transitions.forEach((nextStatus) => {
      if (nextStatus === "CANCELLED") return;
      if (closeTransitions.includes(nextStatus)) return;
      const label = getStatusLabel(nextStatus as any);
      buttons.push(
        <Button
          key={nextStatus}
          variant="outline"
          onClick={() => handleStatusChange(nextStatus)}
        >
          {label}
        </Button>
      );
    });

    // WhatsApp buttons
    if (so!.status === "READY" && getWhatsAppLinkFinished()) {
      buttons.push(
        <a
          key="wpp-ready"
          href={getWhatsAppLinkFinished()!}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
        >
          <MessageCircle className="size-4" />
          WhatsApp
        </a>
      );
    }

    if (so!.status === "DELIVERED" && getWhatsAppLinkDelivered()) {
      buttons.push(
        <a
          key="wpp-delivered"
          href={getWhatsAppLinkDelivered()!}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
        >
          <MessageCircle className="size-4" />
          WhatsApp
        </a>
      );
    }

    // Cancel button
    if (transitions.includes("CANCELLED" as never) && so!.status !== "CANCELLED") {
      buttons.push(
        <Button
          key="cancel"
          variant="destructive"
          size="sm"
          onClick={() => handleStatusChange("CANCELLED")}
        >
          Cancelar
        </Button>
      );
    }

    // Portal link button — always show, generates token if missing
    const portalUrl = so!.publicToken
      ? `${window.location.origin}/portal/os/${so!.publicToken}`
      : null;
    buttons.push(
      <Button
        key="portal"
        variant="outline"
        onClick={async () => {
          if (so!.publicToken) {
            navigator.clipboard.writeText(portalUrl!);
            setCopiedPortal(true);
            setTimeout(() => setCopiedPortal(false), 2000);
          } else {
            // Generate token via PATCH
            try {
              const res = await fetch(`/api/ordens-servico/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ generatePublicToken: true }),
              });
              if (res.ok) {
                const updated = await res.json();
                setSo({ ...so!, publicToken: updated.publicToken });
              }
            } catch {}
          }
        }}
      >
        {copiedPortal ? <Copy className="size-4 mr-1" /> : <ExternalLink className="size-4 mr-1" />}
        {copiedPortal ? "Link copiado!" : so!.publicToken ? "Link do Portal" : "Gerar Link do Portal"}
      </Button>
    );

    // PDF button
    buttons.push(
      <a
        key="pdf"
        href={`/api/pdf/os/${id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
      >
        <FileDown className="size-4" />
        Baixar PDF
      </a>
    );

    buttons.push(
      <Button
        key="back"
        variant="outline"
        onClick={() => router.push("/ordens-servico")}
      >
        Voltar
      </Button>
    );

    return buttons;
  }

  const warrantyInfo = getWarrantyStatus(so.warrantyEnabled, so.warrantyEndDate ? new Date(so.warrantyEndDate) : null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{so.code || `OS #${so.number}`}</h1>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusVariant(so.status as any)}`}>
            {getStatusLabel(so.status as any)}
          </span>
          {priorityInfo && (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityInfo.variant}`}>
              {priorityInfo.label}
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {renderActionButtons()}
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm"
        >
          {error}
        </motion.div>
      )}

      {editing && canEdit ? (
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
      ) : (
        <>
          {/* Customer + OS Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informacoes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Cliente:</span>{" "}
                  <span className="font-medium">{so.customer.name}</span>
                </div>
                {so.customer.phone && (
                  <div>
                    <span className="text-muted-foreground">Telefone:</span>{" "}
                    <span>{so.customer.phone}</span>
                  </div>
                )}
                {so.customer.email && (
                  <div>
                    <span className="text-muted-foreground">E-mail:</span>{" "}
                    <span>{so.customer.email}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusVariant(so.status as any)}`}>
                    {getStatusLabel(so.status as any)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Prioridade:</span>{" "}
                  {priorityInfo && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityInfo.variant}`}>
                      {priorityInfo.label}
                    </span>
                  )}
                </div>
                {so.technician && (
                  <div>
                    <span className="text-muted-foreground">Tecnico:</span>{" "}
                    <span className="font-medium">{so.technician.name}</span>
                  </div>
                )}
                {so.quote && (
                  <div>
                    <span className="text-muted-foreground">Orcamento Vinculado:</span>{" "}
                    <span className="font-medium">#{so.quote.number}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Equipment Section */}
          {(so.equipmentName || so.equipmentBrand || so.equipmentModel || so.serialNumber || so.accessories) && (
            <Card>
              <CardHeader>
                <CardTitle>Equipamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {so.equipmentName && (
                    <div>
                      <span className="text-muted-foreground">Equipamento:</span>{" "}
                      <span className="font-medium">{so.equipmentName}</span>
                    </div>
                  )}
                  {so.equipmentBrand && (
                    <div>
                      <span className="text-muted-foreground">Marca:</span>{" "}
                      <span>{so.equipmentBrand}</span>
                    </div>
                  )}
                  {so.equipmentModel && (
                    <div>
                      <span className="text-muted-foreground">Modelo:</span>{" "}
                      <span>{so.equipmentModel}</span>
                    </div>
                  )}
                  {so.serialNumber && (
                    <div>
                      <span className="text-muted-foreground">N/S:</span>{" "}
                      <span>{so.serialNumber}</span>
                    </div>
                  )}
                  {so.accessories && (
                    <div className="md:col-span-2">
                      <span className="text-muted-foreground">Acessorios:</span>
                      <p className="mt-1 whitespace-pre-wrap">{so.accessories}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Problem + Service Description */}
          {(so.problemDescription || so.serviceDescription) && (
            <Card>
              <CardHeader>
                <CardTitle>Descricao</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {so.problemDescription && (
                  <div>
                    <span className="text-sm text-muted-foreground">Problema Relatado:</span>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{so.problemDescription}</p>
                  </div>
                )}
                {so.serviceDescription && (
                  <div>
                    <span className="text-sm text-muted-foreground">Servico Realizado:</span>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{so.serviceDescription}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Prazos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Data de Entrada:</span>{" "}
                  <span>{so.receivedAt ? formatDate(so.receivedAt) : formatDate(so.openedAt)}</span>
                </div>
                {so.expectedDeliveryDate && (
                  <div>
                    <span className="text-muted-foreground">Previsao de Entrega:</span>{" "}
                    <span>{formatDate(so.expectedDeliveryDate)}</span>
                  </div>
                )}
                {so.completedAt && (
                  <div>
                    <span className="text-muted-foreground">Concluida em:</span>{" "}
                    <span>{formatDate(so.completedAt)}</span>
                  </div>
                )}
                {so.finishedAt && !so.completedAt && (
                  <div>
                    <span className="text-muted-foreground">Finalizada em:</span>{" "}
                    <span>{formatDate(so.finishedAt)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Itens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                  <div className="col-span-5">Descricao</div>
                  <div className="col-span-2 text-center">Qtd</div>
                  <div className="col-span-2 text-right">Preco Unit.</div>
                  <div className="col-span-3 text-right">Total</div>
                </div>
                {so.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 text-sm py-1"
                  >
                    <div className="col-span-5">
                      {item.description}
                      {item.product && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({item.product.name})
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 text-center">{Number(item.quantity)}</div>
                    <div className="col-span-2 text-right">
                      {formatCurrency(Number(item.unitPrice))}
                    </div>
                    <div className="col-span-3 text-right font-medium">
                      {formatCurrency(Number(item.total))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-end gap-2 pt-4 border-t mt-4">
                <div className="flex items-center gap-4 text-base font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(Number(so.total))}</span>
                </div>
                {so.finalAmount !== null && so.finalAmount !== undefined && Number(so.finalAmount) !== Number(so.total) && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Valor Final:</span>
                    <span className="font-semibold">{formatCurrency(Number(so.finalAmount))}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Pagamento
                {so.status !== "CANCELLED" && so.paymentStatus === "PENDING" && !showPayment && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPayment(true)}
                  >
                    Registrar Pagamento
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <span className="text-muted-foreground">Status:</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPaymentStatusVariant(so.paymentStatus as any)}`}>
                  {getPaymentStatusLabel(so.paymentStatus as any)}
                </span>
                {so.paymentMethod && (
                  <>
                    <span className="text-muted-foreground">Metodo:</span>
                    <span className="font-medium">{getPaymentMethodLabel(so.paymentMethod as any)}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm mt-3">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium">{formatCurrency(Number(so.total))}</span>
                <span className="text-muted-foreground ml-4">Pago:</span>
                <span className="font-medium">{formatCurrency(Number(so.paidAmount))}</span>
                <span className="text-muted-foreground ml-4">Restante:</span>
                <span className="font-medium">{formatCurrency(Number(so.total) - Number(so.paidAmount))}</span>
              </div>

              {showPayment && (
                <div className="flex items-end gap-3 mt-4">
                  <div className="space-y-2 flex-1 max-w-xs">
                    <Label htmlFor="paymentAmount">Valor do Pagamento</Label>
                    <Input
                      id="paymentAmount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <Button onClick={handlePayment}>Registrar</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPayment(false);
                      setPaymentAmount("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Stock Card (Etapa 6) ── */}
          {so.inventoryActive && itemsWithProduct.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PackageCheck className="size-4" />
                  Estoque
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasStockDeducted ? (
                  <>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      ✅ Produtos baixados do estoque em{" "}
                      {so.inventoryDeductedAt
                        ? formatDate(so.inventoryDeductedAt)
                        : "—"}
                    </p>
                    <div className="space-y-2">
                      {stockMovements.map((sm) => (
                        <div
                          key={sm.id}
                          className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0"
                        >
                          <span className="font-medium">{sm.product.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                              Qtd: {sm.quantity}
                            </span>
                            <span className="text-muted-foreground">
                              Antes: {sm.previousQuantity} → {sm.newQuantity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      ℹ️ O estoque será baixado automaticamente ao finalizar a Ordem de Serviço.
                    </p>
                    <div className="space-y-2 text-sm">
                      {itemsWithProduct.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                        >
                          <span className="font-medium">
                            {item.product?.name || item.description}
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                              Qtd: {Number(item.quantity)}
                            </span>
                            {item.product && (
                              <span className="text-muted-foreground">
                                Disponível: {Number(item.product.quantity)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Finance Integration (Etapa 5) */}
          {so.status !== "CANCELLED" && !so.financeActive && (
            <Card>
              <CardHeader>
                <CardTitle>Financeiro</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Ative o módulo Financeiro para lançar receitas automaticamente.
                </p>
              </CardContent>
            </Card>
          )}
          {so.financeActive && so.transactions && so.transactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Lançamento Financeiro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-semibold">{formatCurrency(so.transactions[0].amount)}</span>
                  {(() => {
                    const s = so.transactions[0].status;
                    const colors: Record<string, string> = {
                      PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                      PAID: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                      OVERDUE: "bg-destructive/10 text-destructive border-destructive/20",
                      CANCELLED: "bg-muted text-muted-foreground border-border",
                    };
                    const labels: Record<string, string> = {
                      PENDING: "Pendente",
                      PAID: "Pago",
                      OVERDUE: "Vencido",
                      CANCELLED: "Cancelado",
                    };
                    return (
                      <Badge variant="outline" className={colors[s] || ""}>
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
                    className="text-sm text-primary hover:underline"
                  >
                    Ver no Financeiro →
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warranty */}
          {so.warrantyEnabled && (
            <Card>
              <CardHeader>
                <CardTitle>Garantia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${warrantyInfo.variant}`}>
                    {warrantyInfo.label}
                  </span>
                </div>
                {so.warrantyStartDate && (
                  <div>
                    <span className="text-muted-foreground">Inicio:</span>{" "}
                    <span>{formatDate(so.warrantyStartDate)}</span>
                  </div>
                )}
                {so.warrantyEndDate && (
                  <div>
                    <span className="text-muted-foreground">Validade:</span>{" "}
                    <span>{formatDate(so.warrantyEndDate)}</span>
                  </div>
                )}
                {so.warrantyTerms && (
                  <div>
                    <span className="text-muted-foreground">Termos:</span>
                    <p className="mt-1 whitespace-pre-wrap">{so.warrantyTerms}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Internal Notes */}
          {so.internalNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Observacoes Internas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{so.internalNotes}</p>
              </CardContent>
            </Card>
          )}

          {/* Customer Notes */}
          {so.customerNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Observacoes para o Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{so.customerNotes}</p>
              </CardContent>
            </Card>
          )}

          {/* General Notes */}
          {so.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Observacoes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{so.notes}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Close Dialog */}
      <CloseServiceOrderDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        serviceOrder={so}
        onSuccess={(updated) => {
          // Reload OS to get fresh data (stockMovements, etc.)
          loadServiceOrder();
          setCloseDialogOpen(false);
        }}
      />
    </div>
  );
}