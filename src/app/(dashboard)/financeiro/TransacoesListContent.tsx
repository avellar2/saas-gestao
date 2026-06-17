"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { displayStatus, STATUS_CONFIG, getTransactionOrigin, ORIGIN_CONFIG } from "@/lib/finance-helpers";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/layout/pagination";
import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/ui/section-skeleton";
import Link from "next/link";
import { DollarSign, Search, X, Plus, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "PENDING", label: "Pendentes" },
  { value: "PAID", label: "Pagos" },
  { value: "OVERDUE", label: "Vencidos" },
  { value: "CANCELLED", label: "Cancelados" },
];

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
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">{title}</h1>
          <p className="text-base text-muted-foreground mt-2 font-medium">Gerencie contas a receber e a pagar</p>
        </div>
        <Link href="/financeiro/novo">
          <Button size="sm" className="gap-2 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-150 active:scale-[0.97]">
            <Plus className="h-4 w-4" />
            Nova Transação
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg border border-border/60 bg-background px-3 pl-9 pr-9 text-sm shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((f) => {
            const active = statusFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(active ? "" : f.value); setPage(1); }}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 border cursor-pointer select-none ${
                  active
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="Nenhuma transação encontrada"
          description="Tente ajustar os filtros ou crie uma nova transação."
          actionLabel="Nova Transação"
          actionHref="/financeiro/novo"
        />
      ) : (
        <>
          <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/25 hover:bg-muted/25 border-b border-border/50">
                    <TableHead className="py-3.5 pl-5 pr-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Descrição</TableHead>
                    {showOrigin && <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Origem</TableHead>}
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Categoria</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">Valor</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Vencimento</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Status</TableHead>
                    {showActions && <TableHead className="py-3.5 pl-3 pr-5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const origin = getTransactionOrigin(tx);
                    const originCfg = ORIGIN_CONFIG[origin];
                    const OriginIcon = originCfg.icon;
                    const displaySt = displayStatus(tx.status, tx.dueDate);
                    const statusCfg = STATUS_CONFIG[displaySt] || STATUS_CONFIG.PENDING;

                    return (
                      <TableRow key={tx.id} className="group border-b border-border/30 transition-colors duration-150 cursor-pointer hover:bg-emerald-50/30 last:border-b-0">
                        <TableCell className="py-3.5 pl-5 pr-3 text-sm font-medium text-foreground">{tx.description}</TableCell>
                        {showOrigin && (
                          <TableCell className="py-3.5 px-3 text-sm">
                            <div className="flex items-center gap-1.5">
                              <OriginIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{originCfg.label}</span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="py-3.5 px-3 text-sm text-muted-foreground">{tx.category || "—"}</TableCell>
                        <TableCell className="py-3.5 px-3 text-sm font-semibold text-right tabular-nums text-foreground">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className="py-3.5 px-3 text-sm text-muted-foreground">
                          {tx.dueDate ? formatDate(tx.dueDate) : "—"}
                        </TableCell>
                        <TableCell className="py-3.5 px-3 text-sm">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                            displaySt === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : displaySt === "OVERDUE"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : displaySt === "CANCELLED"
                              ? "bg-slate-50 text-slate-700 border-slate-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {statusCfg.label}
                          </span>
                        </TableCell>
                        {showActions && (
                          <TableCell className="py-3.5 pl-3 pr-5 text-right">
                            <Link href={`/financeiro/${tx.id}`}>
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground/40 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-150">
                                <ChevronRight className="h-4 w-4" />
                              </span>
                            </Link>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
