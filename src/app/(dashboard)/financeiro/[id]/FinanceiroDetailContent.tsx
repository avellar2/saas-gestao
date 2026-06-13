"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FinanceiroForm,
  type FinanceiroFormData,
} from "@/components/modules/financeiro-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";

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

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  PAID: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  OVERDUE: "bg-destructive/10 text-destructive border-destructive/20",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || "bg-muted text-muted-foreground border-border";
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    PAID: "Pago",
    OVERDUE: "Vencido",
    CANCELLED: "Cancelado",
  };
  return (
    <Badge variant="outline" className={colors}>
      {labels[status] || status}
    </Badge>
  );
}

export default function FinanceiroDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<
    { id: string; name: string }[]
  >([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [transRes, custRes] = await Promise.all([
          fetch(`/api/financeiro/${id}`),
          fetch("/api/clientes?limit=1000"),
        ]);

        if (!transRes.ok) {
          setError("Transacao nao encontrada");
          return;
        }

        const transData = await transRes.json();
        setTransaction(transData);

        if (custRes.ok) {
          const custData = await custRes.json();
          setCustomers(custData.customers || []);
        }
      } catch {
        setError("Erro ao carregar transacao");
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
      setError(body.error || "Erro ao atualizar transacao");
      return;
    }

    const updated = await res.json();
    setTransaction({ ...transaction!, ...updated });
    setEditing(false);
  }

  async function handleMarkAsPaid() {
    if (!confirm("Marcar esta transacao como paga?")) return;

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
    if (!confirm("Tem certeza que deseja excluir esta transacao?")) return;

    const res = await fetch(`/api/financeiro/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao excluir transacao");
      return;
    }
    router.push("/financeiro");
    router.refresh();
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!transaction) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {error || "Transacao nao encontrada"}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/financeiro")}
        >
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{transaction.description}</h1>
        <div className="flex gap-2">
          {transaction.status === "PENDING" && (
            <Button variant="default" onClick={handleMarkAsPaid}>
              Marcar como Pago
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Cancelar" : "Editar"}
          </Button>
          {!editing && (
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Editar Transacao</CardTitle>
          </CardHeader>
          <CardContent>
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
              submitLabel="Salvar Alteracoes"
              customers={customers}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Informacoes da Transacao</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo:</span>{" "}
                <Badge
                  variant="outline"
                  className={
                    transaction.type === "RECEIVABLE"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }
                >
                  {transaction.type === "RECEIVABLE" ? "A Receber" : "A Pagar"}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <StatusBadge status={transaction.status} />
              </div>
              <div>
                <span className="text-muted-foreground">Valor:</span>{" "}
                <span className="font-semibold">
                  {formatCurrency(Number(transaction.amount))}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Categoria:</span>{" "}
                <span>{transaction.category || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Vencimento:</span>{" "}
                <span>
                  {transaction.dueDate
                    ? formatDate(transaction.dueDate)
                    : "-"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Data Pagamento:</span>{" "}
                <span>
                  {transaction.paidAt
                    ? formatDate(transaction.paidAt)
                    : "-"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Cliente:</span>{" "}
                <span>{transaction.customer?.name || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Criado em:</span>{" "}
                <span>{formatDate(transaction.createdAt)}</span>
              </div>
              {transaction.notes && (
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">Observacoes:</span>{" "}
                  <span>{transaction.notes}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
