"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { displayStatus, STATUS_CONFIG, TYPE_CONFIG, getTransactionOrigin, ORIGIN_CONFIG } from "@/lib/finance-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { DollarSign, Search, X } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  status: string;
  description: string;
  category: string | null;
  amount: number;
  dueDate: string | null;
  paidAt: string | null;
  customerId: string | null;
  serviceOrderId: string | null;
  menuOrderId: string | null;
  customer?: { id: string; name: string } | null;
}

interface Props {
  title: string;
  typeFilter?: "RECEIVABLE" | "PAYABLE";
  showOrigin?: boolean;
  showActions?: boolean;
}

export function TransacoesListContent({ title, typeFilter, showOrigin = true, showActions = true }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/financeiro?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
        setTotalPages(data.totalPages);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search, page]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTransactions();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex items-center gap-2">
          <Link href="/financeiro/novo">
            <Button size="sm">Nova Transação</Button>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg border border-input bg-transparent pl-8 pr-8 text-sm outline-none focus-visible:border-ring"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setPage(1); }}
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="flex gap-1">
          {["", "PENDING", "PAID", "OVERDUE", "CANCELLED"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s ? STATUS_CONFIG[s]?.label || s : "Todos"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhuma transação encontrada</p>
          <p className="text-sm mt-1">Tente ajustar os filtros ou crie uma nova transação.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground text-xs">
                  <th className="text-left p-3 font-medium">Descrição</th>
                  {showOrigin && <th className="text-left p-3 font-medium">Origem</th>}
                  <th className="text-left p-3 font-medium">Categoria</th>
                  <th className="text-right p-3 font-medium">Valor</th>
                  <th className="text-left p-3 font-medium">Vencimento</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  {showActions && <th className="text-left p-3 font-medium">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const origin = getTransactionOrigin(tx);
                  const originCfg = ORIGIN_CONFIG[origin];
                  const OriginIcon = originCfg.icon;
                  const displaySt = displayStatus(tx.status, tx.dueDate);
                  const statusCfg = STATUS_CONFIG[displaySt] || STATUS_CONFIG.PENDING;

                  return (
                    <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium">{tx.description}</td>
                      {showOrigin && (
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <OriginIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs">{originCfg.label}</span>
                          </div>
                        </td>
                      )}
                      <td className="p-3 text-muted-foreground">{tx.category || "-"}</td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="p-3">
                        {tx.dueDate ? formatDate(tx.dueDate) : "-"}
                      </td>
                      <td className="p-3">
                        <Badge variant={statusCfg.variant} className="text-xs">
                          {statusCfg.label}
                        </Badge>
                      </td>
                      {showActions && (
                        <td className="p-3">
                          <Link href={`/financeiro/${tx.id}`}>
                            <Button variant="outline" size="sm">
                              Ver
                            </Button>
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
