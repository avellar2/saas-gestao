"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QuoteForm, type QuoteFormData } from "@/components/modules/quote-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MessageCircle, FileDown, ChevronLeft, Trash2, Send, CheckSquare, XCircle, Wrench, Edit, Copy, Link } from "lucide-react";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ActionBar } from "@/components/layout/action-bar";
import { SendDialog } from "@/components/quote/send-dialog";
import { ApprovePhysicalDialog } from "@/components/quote/approve-physical-dialog";


interface QuoteItem {
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

interface QuoteDetail {
  id: string;
  number: number;
  status: string;
  description: string | null;
  subtotal: number;
  discount: number;
  total: number;
  validUntil: string | null;
  notes: string | null;
  customerId: string;
  publicToken: string | null;
  sentAt: string | null;
  sentVia: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  approvalSource: string | null;
  rejectionReason: string | null;
  customer: CustomerDetail;
  items: QuoteItem[];
  createdAt: string;
  updatedAt: string;
}

interface CustomerOption {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  salePrice: number;
  quantity: number;
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

export default function OrcamentoDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [inventoryActive, setInventoryActive] = useState(false);

  useEffect(() => {
    async function loadQuote() {
      try {
        const res = await fetch(`/api/orcamentos/${id}`);
        if (!res.ok) {
          setError("Orcamento nao encontrado");
          return;
        }
        const data = await res.json();
        setQuote(data);
      } catch {
        setError("Erro ao carregar orcamento");
      } finally {
        setLoading(false);
      }
    }
    loadQuote();
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
    async function loadProducts() {
      try {
        const invRes = await fetch("/api/estoque?limit=1");
        if (invRes.ok) {
          setInventoryActive(true);
          const prodRes = await fetch("/api/estoque?limit=500&active=true");
          if (prodRes.ok) {
            const prodData = await prodRes.json();
            setProducts(
              (prodData.products || []).map(
                (p: { id: string; name: string; salePrice: number; quantity: number }) => ({
                  id: p.id,
                  name: p.name,
                  salePrice: p.salePrice,
                  quantity: p.quantity,
                })
              )
            );
          }
        }
      } catch {
        // silently fail
      }
    }
    loadProducts();
  }, []);

  async function handleStatusChange(newStatus: string) {
    if (!quote) return;
    setError(null);

    // Only allow EXPIRED via PUT (SENT/APPROVED/REJECTED use dedicated endpoints)
    if (newStatus !== "EXPIRED" && newStatus !== "DRAFT") {
      setError(`Status "${newStatus}" deve ser alterado via endpoint dedicado`);
      return;
    }

    const res = await fetch(`/api/orcamentos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao atualizar status");
      return;
    }

    const updated = await res.json();
    setQuote({ ...quote, ...updated });
  }

  async function handleConvertToServiceOrder() {
    if (!quote) return;
    setError(null);

    const res = await fetch(`/api/orcamentos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ convertToServiceOrder: true }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao converter em OS");
      return;
    }

    router.push("/ordens-servico");
    router.refresh();
  }

  async function handleUpdate(data: QuoteFormData) {
    setError(null);
    const res = await fetch(`/api/orcamentos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao atualizar orcamento");
      return;
    }

    const updated = await res.json();
    setQuote({ ...quote!, ...updated });
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este orcamento?")) return;

    const res = await fetch(`/api/orcamentos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao excluir orcamento");
      return;
    }
    router.push("/orcamentos");
    router.refresh();
  }

  function getWhatsAppLink(): string | null {
    if (!quote) return null;
    const phone = quote.customer.whatsapp || quote.customer.phone;
    if (!phone) return null;
    const portalUrl = quote.publicToken
      ? `${window.location.origin}/portal/orcamento/${quote.publicToken}`
      : null;
    if (!portalUrl) return null;

    const message = `Ola ${quote.customer.name}! Segue o orcamento nº ${quote.number} no valor de ${formatCurrency(Number(quote.total))}. Visualize e aprove pelo link: ${portalUrl}`;
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.length <= 11 ? "55" + cleanPhone : cleanPhone;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  }

  async function handleCopyPublicLink() {
    if (!quote?.publicToken) return;
    const url = `${window.location.origin}/portal/orcamento/${quote.publicToken}`;
    await navigator.clipboard.writeText(url);
    setError(null);
  }

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <DetailSkeleton />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <EmptyState
          title="Orcamento nao encontrado"
          description={error || "O orcamento solicitado nao existe ou foi removido."}
          actionLabel="Voltar para Orcamentos"
          actionHref="/orcamentos"
        />
      </div>
    );
  }

  const statusLabel = getStatusLabel(quote.status);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg h-9 text-sm font-semibold border-border/80 hover:bg-muted/50 transition-all duration-150"
          onClick={() => router.push("/orcamentos")}
        >
          <ChevronLeft className="h-4 w-4 mr-1.5" />
          Voltar
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Primary actions */}
          {(quote.status === "DRAFT" || quote.status === "SENT") && !editing && (
            <SendDialog
              quoteId={id}
              customerName={quote.customer.name}
              customerPhone={quote.customer.phone}
              customerWhatsapp={quote.customer.whatsapp}
              customerEmail={quote.customer.email}
              isSent={quote.status === "SENT"}
              onSent={() => {
                fetch(`/api/orcamentos/${id}`).then(r => r.json()).then(setQuote);
              }}
            />
          )}

          {quote.status === "SENT" && (
            <ApprovePhysicalDialog
              quoteId={id}
              onApproved={() => {
                fetch(`/api/orcamentos/${id}`).then(r => r.json()).then(setQuote);
              }}
            />
          )}

          {quote.status === "APPROVED" && (
            <Button onClick={() => router.push(`/ordens-servico/novo?quoteId=${id}`)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Wrench className="h-4 w-4 mr-1.5" />
              Gerar OS
            </Button>
          )}

          {/* Secondary actions */}
          {quote.status === "DRAFT" && !editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-1.5" />
              Editar
            </Button>
          )}
          {quote.status === "DRAFT" && editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={() => window.open(`/api/pdf/orcamento/${id}`, "_blank")}>
            <FileDown className="h-4 w-4 mr-1.5" />
            Baixar PDF
          </Button>

          {quote.publicToken && (
            <Button variant="outline" size="sm" onClick={handleCopyPublicLink}>
              <Copy className="h-4 w-4 mr-1.5" />
              Copiar link
            </Button>
          )}

          {getWhatsAppLink() && (
            <Button variant="outline" size="sm" onClick={() => window.open(getWhatsAppLink()!, "_blank")}>
              <MessageCircle className="h-4 w-4 mr-1.5" />
              WhatsApp
            </Button>
          )}

          {(quote.status === "DRAFT" || quote.status === "APPROVED" || quote.status === "REJECTED" || quote.status === "EXPIRED" || quote.status === "SENT") && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              Excluir
            </Button>
          )}
        </div>
      </div>

        {editing ? (
          <div
            key="edit"
                     >
            <div className="rounded-2xl border border-border/60 border-t-2 border-t-blue-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden"
            >
              <div className="px-6 py-4 bg-blue-50/40 border-b border-border/30"
              >
                <h2 className="text-base font-bold text-foreground"
                >Editar Orçamento</h2>
                <p className="text-sm text-muted-foreground"
                >Atualize os dados do orçamento</p>
              </div>
              <div className="p-6"
              >
                <QuoteForm
                  customers={customers}
                  products={products}
                  inventoryActive={inventoryActive}
                  initialData={{
                    customerId: quote.customerId,
                    description: quote.description || "",
                    validUntil: quote.validUntil
                      ? new Date(quote.validUntil).toISOString().split("T")[0]
                      : "",
                    discount: Number(quote.discount),
                    notes: quote.notes || "",
                    items: quote.items.map((item) => ({
                      description: item.description,
                      quantity: Number(item.quantity),
                      unitPrice: Number(item.unitPrice),
                    })),
                  }}
                  onSubmit={handleUpdate}
                  submitLabel="Salvar Alteracoes"
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            key="view"
                       className="space-y-6"
          >
            {/* Error */}
            {error && (
                <div
                                   className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm"
                >
                  {error}
                </div>
              )}

            {/* Hero Card */}
            <div
            >
              <div className="rounded-2xl border border-border/60 border-t-2 border-t-blue-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden"
              >
                <div className="px-6 py-5 bg-blue-50/40 border-b border-border/30"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="flex items-center gap-3"
                    >
                      <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-blue-100 text-blue-600"
                      >
                        <span className="text-lg font-extrabold">#</span>
                      </div>
                      <div>
                        <h1 className="text-xl font-extrabold text-foreground"
                        >
                          Orçamento #{quote.number}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5"
                        >Criado em {formatDate(quote.createdAt)}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold border ${
                        quote.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : quote.status === "SENT"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : quote.status === "REJECTED"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : quote.status === "EXPIRED"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  {[
                    { label: "Cliente", value: quote.customer.name },
                    { label: "Telefone", value: quote.customer.phone || "—" },
                    { label: "E-mail", value: quote.customer.email || "—" },
                    { label: "Validade", value: quote.validUntil ? formatDate(quote.validUntil) : "—" },
                    { label: "Descricao", value: quote.description || "—" },
                    ...(quote.sentAt ? [{ label: "Enviado em", value: formatDate(quote.sentAt) }] : []),
                    ...(quote.sentVia ? [{ label: "Canal de envio", value: quote.sentVia === "EMAIL" ? "E-mail" : quote.sentVia === "WHATSAPP" ? "WhatsApp" : "Manual" }] : []),
                    ...(quote.approvedAt ? [{ label: "Aprovado em", value: `${formatDate(quote.approvedAt)} (${quote.approvalSource === "ONLINE" ? "online" : "presencial"})` }] : []),
                    ...(quote.rejectedAt ? [{ label: "Rejeitado em", value: formatDate(quote.rejectedAt) }] : []),
                    ...(quote.rejectionReason ? [{ label: "Motivo da recusa", value: quote.rejectionReason }] : []),
                  ].map((info, idx) => (
                    <div key={idx} className="space-y-1"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                      >{info.label}</p>
                      <p className="text-sm font-medium text-foreground leading-relaxed"
                      >{info.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Items */}
            <div
            >
              <div className="rounded-2xl border border-border/60 border-t-2 border-t-blue-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden"
              >
                <div className="px-6 py-4 bg-blue-50/40 border-b border-border/30"
                >
                  <h2 className="text-base font-bold text-foreground"
                  >Itens e Serviços</h2>
                </div>
                <div className="overflow-x-auto"
                >
                  <table className="w-full text-sm"
                  >
                    <thead>
                      <tr className="bg-muted/30 transition-colors"
                      >
                        <th className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground px-4 py-3 text-left"
                        >Descrição</th>
                        <th className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground px-4 py-3 text-center"
                        >Qtd</th>
                        <th className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground px-4 py-3 text-right"
                        >Unit.</th>
                        <th className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground px-4 py-3 text-right"
                        >Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.items.length === 0 ? (
                        <tr
                        >
                          <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground"
                          >
                            Nenhum item cadastrado
                          </td>
                        </tr>
                      ) : (
                        quote.items.map((item) => (
                          <tr key={item.id} className="hover:bg-blue-50/30 transition-colors duration-150 border-b border-border/30 last:border-0"
                          >
                            <td className="px-4 py-3.5 text-sm font-medium text-foreground"
                            >{item.description}</td>
                            <td className="px-4 py-3.5 text-sm text-center text-foreground"
                            >{Number(item.quantity)}</td>
                            <td className="px-4 py-3.5 text-sm text-right text-foreground"
                            >{formatCurrency(Number(item.unitPrice))}</td>
                            <td className="px-4 py-3.5 text-sm font-semibold text-right text-foreground"
                            >{formatCurrency(Number(item.total))}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="px-6 py-5 bg-muted/20 border-t border-border/30"
                >
                  <div className="flex flex-col sm:flex-row justify-end gap-4"
                  >
                    <div className="text-right space-y-2"
                    >
                      <div className="text-sm text-muted-foreground"
                      >
                        Subtotal:{" "}
                        <span className="ml-2 font-medium text-foreground"
                        >{formatCurrency(Number(quote.subtotal))}</span>
                      </div>
                      {Number(quote.discount) > 0 && (
                        <div className="text-sm text-muted-foreground"
                        >
                          Desconto:{" "}
                          <span className="ml-2 font-medium text-red-600"
                          >
                            -{formatCurrency(Number(quote.discount))}
                          </span>
                        </div>
                      )}
                      <div className="text-lg font-extrabold text-foreground pt-2 border-t border-border/30"
                      >
                        Total:{" "}
                        <span className="text-blue-600"
                        >{formatCurrency(Number(quote.total))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div
              >
                <div className="rounded-2xl border border-border/60 border-t-2 border-t-blue-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden"
                >
                  <div className="px-6 py-4 bg-blue-50/40 border-b border-border/30"
                  >
                    <h2 className="text-base font-bold text-foreground"
                    >Observações</h2>
                  </div>
                  <div className="px-6 py-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap"
                  >
                    {quote.notes}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
