"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import { QuoteForm, type QuoteFormData } from "@/components/modules/quote-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildWhatsAppLink, quoteWhatsAppMessage } from "@/lib/whatsapp";
import { MessageCircle, FileDown, ChevronLeft, Trash2, Send, CheckSquare, XCircle, Wrench, Edit } from "lucide-react";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ActionBar } from "@/components/layout/action-bar";

const easeOut = [0.23, 1, 0.32, 1] as [number, number, number, number];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, duration: 0.3, ease: easeOut },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: easeOut } },
};

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
  customer: CustomerDetail;
  items: QuoteItem[];
  createdAt: string;
  updatedAt: string;
}

interface CustomerOption {
  id: string;
  name: string;
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

  async function handleStatusChange(newStatus: string) {
    if (!quote) return;
    setError(null);

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
    return buildWhatsAppLink(
      phone,
      quoteWhatsAppMessage(
        quote.customer.name,
        quote.number,
        Number(quote.total),
        ""
      )
    );
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

        <ActionBar
          primaryActions={[
            ...(quote.status === "DRAFT" && !editing
              ? [{ key: "send", label: "Enviar", icon: Send, variant: "default" as const, onClick: () => handleStatusChange("SENT") }]
              : []),
            ...(quote.status === "SENT"
              ? [
                  { key: "approve", label: "Aprovar", icon: CheckSquare, variant: "default" as const, onClick: () => handleStatusChange("APPROVED") },
                  { key: "reject", label: "Rejeitar", icon: XCircle, variant: "outline" as const, onClick: () => handleStatusChange("REJECTED") },
                ]
              : []),
            ...(quote.status === "APPROVED"
              ? [{ key: "convert", label: "Converter em OS", icon: Wrench, variant: "default" as const, onClick: handleConvertToServiceOrder }]
              : []),
          ]}
          secondaryActions={[
            ...(quote.status === "DRAFT" && !editing
              ? [{ key: "edit", label: "Editar", icon: Edit, variant: "outline" as const, onClick: () => setEditing(true) }]
              : []),
            ...(quote.status === "DRAFT" && editing
              ? [{ key: "cancel", label: "Cancelar", variant: "outline" as const, onClick: () => setEditing(false) }]
              : []),
            { key: "pdf", label: "Baixar PDF", icon: FileDown, variant: "outline" as const, href: `/api/pdf/orcamento/${id}`, external: true },
            ...(getWhatsAppLink()
              ? [{ key: "whatsapp", label: "WhatsApp", icon: MessageCircle, variant: "outline" as const, href: getWhatsAppLink()!, external: true }]
              : []),
            ...(quote.status === "DRAFT"
              ? [
                  { divider: true } as { key: string; label: string; divider: true },
                  { key: "delete", label: "Excluir", icon: Trash2, variant: "destructive" as const, onClick: handleDelete },
                ]
              : []),
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        {editing ? (
          <m.div
            key="edit"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
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
          </m.div>
        ) : (
          <m.div
            key="view"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
            className="space-y-6"
          >
            {/* Error */}
            <AnimatePresence>
              {error && (
                <m.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm"
                >
                  {error}
                </m.div>
              )}
            </AnimatePresence>

            {/* Hero Card */}
            <m.div variants={itemVariants}
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
            </m.div>

            {/* Items */}
            <m.div variants={itemVariants}
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
            </m.div>

            {/* Notes */}
            {quote.notes && (
              <m.div variants={itemVariants}
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
              </m.div>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
