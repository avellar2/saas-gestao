"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { formatMonthLabel } from "@/lib/relatorios-helpers";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/ui/section-skeleton";
import { PIE_COLORS, CHART_SERIES } from "@/lib/chart-palette";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Clock, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line,
} from "recharts";
import { Button } from "@/components/ui/button";

interface FinanceiroData {
  month: string;
  resumo: {
    receitas: number;
    despesas: number;
    saldo: number;
    contasVencidas: number;
    contasPendentes: number;
  };
  receitasPorDia: { date: string; valor: number }[];
  despesasPorDia: { date: string; valor: number }[];
  receitasPorOrigem: { origem: string; valor: number }[];
  despesasPorCategoria: { categoria: string; valor: number }[];
}

const ORIGEM_LABELS: Record<string, string> = {
  os: "OS",
  cardapio: "Cardápio",
  manual: "Manual",
};

export function FinanceiroContent() {
  const searchParams = useSearchParams();
  const month = searchParams.get("month") || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const [data, setData] = useState<FinanceiroData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/relatorios/financeiro?month=${month}`);
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
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <PageSkeleton statCards={5} sections={3} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <EmptyState
          icon={DollarSign}
          title="Nenhum dado financeiro disponível"
          description="Não há dados para o período selecionado."
        />
      </div>
    );
  }

  const { resumo, receitasPorDia, despesasPorDia, receitasPorOrigem, despesasPorCategoria } = data;

  // Combinar receitas e despesas por dia para o ComposedChart
  const allDays = new Set<string>();
  for (const d of receitasPorDia) allDays.add(d.date);
  for (const d of despesasPorDia) allDays.add(d.date);
  const dailyData = Array.from(allDays).sort().map(date => {
    const receita = receitasPorDia.find(d => d.date === date)?.valor || 0;
    const despesa = despesasPorDia.find(d => d.date === date)?.valor || 0;
    return { date, receita, despesa, saldo: receita - despesa };
  });

  // Saldo acumulado
  let acc = 0;
  for (const d of dailyData) {
    acc += d.receita - d.despesa;
    d.saldo = acc;
  }

  const statItems = [
    { label: "Receitas", value: resumo.receitas, prefix: "R$ ", icon: TrendingUp, tone: "success" as const },
    { label: "Despesas", value: resumo.despesas, prefix: "R$ ", icon: TrendingDown, tone: "danger" as const },
    { label: "Saldo", value: resumo.saldo, prefix: "R$ ", icon: DollarSign, tone: resumo.saldo >= 0 ? "success" as const : "danger" as const },
    { label: "Vencidas", value: resumo.contasVencidas, prefix: "", icon: AlertTriangle, tone: resumo.contasVencidas > 0 ? "danger" as const : "default" as const },
    { label: "Pendentes", value: resumo.contasPendentes, prefix: "", icon: Clock, tone: "warning" as const },
  ];

  const toneClasses: Record<string, string> = {
    success: "text-emerald-600",
    danger: "text-red-600",
    warning: "text-amber-600",
    info: "text-blue-600",
    default: "text-foreground",
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Relatório Financeiro</h1>
          <p className="text-base text-muted-foreground mt-2 font-medium">{formatMonthLabel(month)}</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 px-3.5 rounded-lg border-border/80 hover:bg-muted/50 transition-all duration-150" onClick={loadData}>
          Atualizar
        </Button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statItems.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-border/60 border-t-2 border-t-violet-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="px-5 py-4 bg-violet-50/40 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-violet-600" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{s.label}</span>
                </div>
              </div>
              <div className="p-5">
                <p className={`text-3xl font-extrabold tracking-tight tabular-nums ${toneClasses[s.tone]}`}>
                  {s.prefix}{typeof s.value === "number" && s.value % 1 !== 0 ? s.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : s.value.toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border/60 border-t-2 border-t-violet-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-6 py-5 bg-violet-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Fluxo de Caixa Diário</h2>
                <p className="text-base text-muted-foreground">Receitas, despesas e saldo acumulado</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {dailyData.length === 0 ? (
              <EmptyState
                variant="compact"
                title="Nenhum dado"
                description="Não há dados no período."
              />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyData}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => {
                        const d = new Date(v);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: unknown) => formatCurrency(value as number)}
                      labelFormatter={(label: unknown) =>
                        new Date(label as string).toLocaleDateString("pt-BR")
                      }
                    />
                    <Bar dataKey="receita" name="Receitas" fill={CHART_SERIES.receita} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesa" name="Despesas" fill={CHART_SERIES.despesa} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="saldo" name="Saldo Acumulado" stroke={CHART_SERIES.saldo} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 border-t-2 border-t-violet-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-6 py-5 bg-violet-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <PieChartIcon className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Receitas por Origem</h2>
                <p className="text-base text-muted-foreground">De onde vem sua receita</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {receitasPorOrigem.length === 0 ? (
              <EmptyState
                variant="compact"
                title="Nenhuma receita"
                description="Não há receitas no período."
              />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={receitasPorOrigem}
                      dataKey="valor"
                      nameKey="origem"
                      cx="50%" cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${ORIGEM_LABELS[name || ""] || name} ${(percent! * 100).toFixed(0)}%`
                      }
                    >
                      {receitasPorOrigem.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: unknown) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 border-t-2 border-t-violet-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-6 py-5 bg-violet-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Despesas por Categoria (Top 5)</h2>
                <p className="text-base text-muted-foreground">Onde você mais gasta</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {despesasPorCategoria.length === 0 ? (
              <EmptyState
                variant="compact"
                title="Nenhuma despesa"
                description="Não há despesas no período."
              />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={despesasPorCategoria} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="categoria" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip formatter={(value: unknown) => formatCurrency(value as number)} />
                    <Bar dataKey="valor" name="Valor" fill={CHART_SERIES.despesa} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
