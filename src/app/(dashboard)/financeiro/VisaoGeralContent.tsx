"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { currentMonth, formatMonthLabel, ORIGIN_CONFIG } from "@/lib/finance-helpers";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/ui/section-skeleton";
import Link from "next/link";
import { CHART_SERIES, PIE_COLORS } from "@/lib/chart-palette";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { DollarSign, ArrowUpFromLine, ArrowDownFromLine, AlertTriangle, TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon, Pencil } from "lucide-react";

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

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <PageSkeleton statCards={4} sections={2} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <EmptyState
          icon={DollarSign}
          title="Nenhum dado disponível"
          description="Não há dados financeiros para o período selecionado."
          actionLabel="Nova Transação"
          actionHref="/financeiro/novo"
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Visão Geral Financeira</h1>
          <p className="text-base text-muted-foreground mt-2 font-medium">{formatMonthLabel(month)}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 rounded-lg border border-border/60 bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
          />
          <Button variant="outline" size="sm" className="h-9 px-3.5 rounded-lg border-border/80 hover:bg-muted/50 transition-all duration-150" onClick={loadResumo}>
            Atualizar
          </Button>
          <Link href="/financeiro/novo">
            <Button size="sm" className="gap-2 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-150 active:scale-[0.97]">
              Nova Transação
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 bg-emerald-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <ArrowUpFromLine className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">Receita do Mês</span>
            </div>
          </div>
          <div className="p-5">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">{formatCurrency(data.receivable.total)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(data.receivable.paid)} recebido</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 bg-emerald-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <ArrowDownFromLine className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">Despesa do Mês</span>
            </div>
          </div>
          <div className="p-5">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">{formatCurrency(data.payable.total)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(data.payable.paid)} pago</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 bg-emerald-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">Saldo do Mês</span>
            </div>
          </div>
          <div className="p-5">
            <p className={`text-3xl font-extrabold tracking-tight tabular-nums ${data.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(data.balance)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 bg-emerald-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">Contas Vencidas</span>
            </div>
          </div>
          <div className="p-5">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">{data.receivable.overdue + data.payable.overdue}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(data.receivable.overdue)} a receber</p>
          </div>
        </div>
      </div>

      {/* Stats secundários */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 bg-emerald-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">A Receber em Aberto</span>
            </div>
          </div>
          <div className="p-5">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">{formatCurrency(totalOpenReceivable)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.receivable.pending} pendente · {data.receivable.overdue} vencido</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 bg-emerald-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">A Pagar em Aberto</span>
            </div>
          </div>
          <div className="p-5">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">{formatCurrency(totalOpenPayable)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.payable.pending} pendente · {data.payable.overdue} vencido</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 bg-emerald-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Pencil className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">Receitas por Origem</span>
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-2">
              {Object.entries(data.byOrigin).map(([origin, amount]) => {
                const cfg = ORIGIN_CONFIG[origin as keyof typeof ORIGIN_CONFIG];
                const Icon = cfg?.icon || Pencil;
                return (
                  <div key={origin} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{cfg?.label || origin}</span>
                    </div>
                    <span className="font-medium tabular-nums">{formatCurrency(amount)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-6 py-5 bg-emerald-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Receitas x Despesas por Dia</h2>
                <p className="text-base text-muted-foreground">Comparativo diário no período</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {data.daily.length === 0 ? (
              <EmptyState
                variant="compact"
                title="Nenhuma transação"
                description="Não há transações no período selecionado."
              />
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
                    <Bar dataKey="receivable" name="Receitas" fill={CHART_SERIES.receita} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="payable" name="Despesas" fill={CHART_SERIES.despesa} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-6 py-5 bg-emerald-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <PieChartIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Distribuição por Categoria</h2>
                <p className="text-base text-muted-foreground">Composição das transações</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {data.byCategory.length === 0 ? (
              <EmptyState
                variant="compact"
                title="Nenhuma categoria"
                description="Não há categorias registradas no período."
              />
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
      </div>
    </div>
  );
}
