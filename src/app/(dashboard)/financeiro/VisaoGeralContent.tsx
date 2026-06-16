"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { currentMonth, formatMonthLabel, STATUS_CONFIG, TYPE_CONFIG, ORIGIN_CONFIG } from "@/lib/finance-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { DollarSign, ArrowUpFromLine, ArrowDownFromLine, AlertTriangle, Wrench, UtensilsCrossed, Pencil } from "lucide-react";

const PIE_COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];

interface ResumoData {
  month: string;
  receivable: { total: number; paid: number; pending: number; overdue: number };
  payable: { total: number; paid: number; pending: number; overdue: number };
  balance: number;
  byOrigin: Record<string, number>;
  byCategory: Array<{ category: string; type: string; amount: number }>;
  daily: Array<{ date: string; receivable: number; payable: number }>;
}

export function VisaoGeralContent() {
  const today = new Date();
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<ResumoData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadResumo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financeiro/resumo?month=${month}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadResumo();
  }, [loadResumo]);

  const totalOpenReceivable = data
    ? data.receivable.pending + data.receivable.overdue
    : 0;
  const totalOpenPayable = data
    ? data.payable.pending + data.payable.overdue
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Visão Geral Financeira</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
          />
          <Button variant="outline" size="sm" onClick={loadResumo}>
            Atualizar
          </Button>
          <Link href="/financeiro/novo">
            <Button size="sm">Nova Transação</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !data ? (
        <div className="text-center py-16 text-muted-foreground">
          <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum dado disponível</p>
        </div>
      ) : (
        <>
          {/* Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border bg-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowUpFromLine className="h-4 w-4 text-emerald-500" />
                Receita do Mês
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(data.receivable.total)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(data.receivable.paid)} recebido
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowDownFromLine className="h-4 w-4 text-destructive" />
                Despesa do Mês
              </div>
              <p className="text-2xl font-bold text-destructive">
                {formatCurrency(data.payable.total)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(data.payable.paid)} pago
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4 text-primary" />
                Saldo do Mês
              </div>
              <p className={`text-2xl font-bold ${data.balance >= 0 ? "text-primary" : "text-destructive"}`}>
                {formatCurrency(data.balance)}
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Contas Vencidas
              </div>
              <p className="text-2xl font-bold text-amber-600">
                {data.receivable.overdue + data.payable.overdue}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(data.receivable.overdue)} a receber
              </p>
            </div>
          </div>

          {/* Cards secundários */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border bg-card p-4 space-y-1">
              <p className="text-sm text-muted-foreground">A Receber em Aberto</p>
              <p className="text-xl font-bold">{formatCurrency(totalOpenReceivable)}</p>
              <p className="text-xs text-muted-foreground">
                {data.receivable.pending} pendente · {data.receivable.overdue} vencido
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-1">
              <p className="text-sm text-muted-foreground">A Pagar em Aberto</p>
              <p className="text-xl font-bold">{formatCurrency(totalOpenPayable)}</p>
              <p className="text-xs text-muted-foreground">
                {data.payable.pending} pendente · {data.payable.overdue} vencido
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-1">
              <p className="text-sm text-muted-foreground">Receitas por Origem</p>
              <div className="space-y-1 mt-2">
                {Object.entries(data.byOrigin).map(([origin, amount]) => {
                  const cfg = ORIGIN_CONFIG[origin as keyof typeof ORIGIN_CONFIG];
                  const Icon = cfg?.icon || Pencil;
                  return (
                    <div key={origin} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{cfg?.label || origin}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(amount)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Receita x Despesa por dia */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <h2 className="font-semibold text-sm">Receitas x Despesas por Dia</h2>
              {data.daily.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma transação no período.
                </p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.daily}>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => v.slice(5)}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: unknown) => formatCurrency(value as number)}
                        labelFormatter={(label: unknown) =>
                          new Date(label as string).toLocaleDateString("pt-BR")
                        }
                      />
                      <Bar dataKey="receivable" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="payable" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Distribuição por categoria */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <h2 className="font-semibold text-sm">Distribuição por Categoria</h2>
              {data.byCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma categoria registrada.
                </p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.byCategory}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }: { name?: string; percent?: number }) =>
                          `${name || ""} ${((percent || 0) * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {data.byCategory.map((_, index) => (
                          <Cell
                            key={index}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: unknown) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
