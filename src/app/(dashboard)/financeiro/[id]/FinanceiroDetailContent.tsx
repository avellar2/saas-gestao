"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FinanceiroForm,
  type FinanceiroFormData,
} from "@/components/modules/financeiro-form";
import { Button } from "@/components/ui/button";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Banknote, Pencil, Trash2, ArrowLeft, CheckCircle, FileText } from "lucide-react";

interface CustomerInfo {
  id: string;
  name: string;
}

interface TransactionDetail {
  id: string;
  type: string;
  description: string;
  category: string | null;
  amount: number;
  dueDate: string | null;
  paidAt: string | null;
  status: string;
  customerId: string | null;
  customer: CustomerInfo | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CLASSES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OVERDUE: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-slate-50 text-slate-700 border-slate-200",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  OVERDUE: "Vencido",
  CANCELLED: "Cancelado",
};

const easeOut = [0.23, 1, 0.32, 1] as [number, number, number, number];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: easeOut },
  },
};

export default function FinanceiroDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [transRes, custRes] = await Promise.all([
          fetch(`/api/financeiro/${id}`),
          fetch("/api/clientes?limit=1000"),
        ]);

        if (!transRes.ok) {
          setError("Transação não encontrada");
          return;
        }

        const transData = await transRes.json();
        setTransaction(transData);

        if (custRes.ok) {
          const custData = await custRes.json();
          setCustomers(custData.customers || []);
        }
      } catch {
        setError("Erro ao carregar transação");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  async function handleUpdate(data: FinanceiroFormData) {
    setError(null);
    const res = await fetch(`/api/financeiro/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        amount: parseFloat(data.amount),
        dueDate: data.dueDate || null,
        customerId: data.customerId || null,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao atualizar transação");
      return;
    }

    const updated = await res.json();
    setTransaction({ ...transaction!, ...updated });
    setEditing(false);
  }

  async function handleMarkAsPaid() {
    if (!confirm("Marcar esta transação como paga?")) return;

    const res = await fetch(`/api/financeiro/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "PAID",
        paidAt: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao marcar como pago");
      return;
    }

    const updated = await res.json();
    setTransaction({ ...transaction!, ...updated });
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;

    const res = await fetch(`/api/financeiro/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao excluir transação");
      return;
    }
    router.push("/financeiro");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <DetailSkeleton />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <EmptyState
          title="Transação não encontrada"
          description={error || "A transação solicitada não existe ou foi removida."}
          actionLabel="Voltar para Financeiro"
          actionHref="/financeiro"
        />
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-[1400px] mx-auto px-6 py-8 space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-base font-medium"
        >
          {error}
        </motion.div>
      )}

      {editing ? (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[2.25rem] font-extrabold text-foreground">Editar Transação</h1>
              <p className="text-base font-medium text-muted-foreground mt-1">{transaction.description}</p>
            </div>
            <Button variant="outline" onClick={() => setEditing(false)} className="rounded-lg h-9 border-border/80 hover:bg-muted/50 transition-all duration-150">
              Cancelar
            </Button>
          </div>
          <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-6 py-5 bg-emerald-50/40 dark:bg-emerald-950/20 border-b border-border/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Dados da Transação</h2>
                <p className="text-base text-muted-foreground font-medium">Altere as informações abaixo</p>
              </div>
            </div>
            <div className="p-6">
              <FinanceiroForm
                initialData={{
                  type: transaction.type as "RECEIVABLE" | "PAYABLE",
                  description: transaction.description,
                  category: transaction.category || "",
                  amount: String(transaction.amount),
                  dueDate: transaction.dueDate
                    ? transaction.dueDate.split("T")[0]
                    : "",
                  customerId: transaction.customerId || "",
                  notes: transaction.notes || "",
                }}
                onSubmit={handleUpdate}
                submitLabel="Salvar Alterações"
                customers={customers}
              />
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                  <Banknote className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-[2.25rem] font-extrabold text-foreground">{transaction.description}</h1>
                  <div className="flex items-center gap-3 mt-1 text-base text-muted-foreground">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${STATUS_CLASSES[transaction.status] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                      {STATUS_LABELS[transaction.status] || transaction.status}
                    </span>
                    <span>{formatCurrency(Number(transaction.amount))}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {transaction.status === "PENDING" && (
                  <Button onClick={handleMarkAsPaid} className="rounded-lg h-9 bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-150 active:scale-[0.97]">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar como Pago
                  </Button>
                )}
                <Button variant="outline" onClick={() => setEditing(true)} className="rounded-lg h-9 border-border/80 hover:bg-muted/50 transition-all duration-150">
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button variant="destructive" onClick={handleDelete} className="rounded-lg h-9 transition-all duration-150 active:scale-[0.97]">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
                <Button variant="ghost" onClick={() => router.push("/financeiro")} className="rounded-lg h-9 hover:bg-muted/50 transition-all duration-150">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-6 py-5 bg-emerald-50/40 dark:bg-emerald-950/20 border-b border-border/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Informações da Transação</h2>
                  <p className="text-base text-muted-foreground font-medium">Detalhes completos</p>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Tipo</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${transaction.type === "RECEIVABLE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                      {transaction.type === "RECEIVABLE" ? "A Receber" : "A Pagar"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Status</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${STATUS_CLASSES[transaction.status] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                      {STATUS_LABELS[transaction.status] || transaction.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Valor</p>
                    <p className="text-base text-foreground font-semibold">{formatCurrency(Number(transaction.amount))}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Categoria</p>
                    <p className="text-base text-foreground">{transaction.category || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Vencimento</p>
                    <p className="text-base text-foreground">{transaction.dueDate ? formatDate(transaction.dueDate) : "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Data Pagamento</p>
                    <p className="text-base text-foreground">{transaction.paidAt ? formatDate(transaction.paidAt) : "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Cliente</p>
                    <p className="text-base text-foreground">{transaction.customer?.name || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Criado em</p>
                    <p className="text-base text-foreground">{formatDate(transaction.createdAt)}</p>
                  </div>
                  {transaction.notes && (
                    <div className="md:col-span-2 space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Observações</p>
                      <p className="text-base text-foreground">{transaction.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
