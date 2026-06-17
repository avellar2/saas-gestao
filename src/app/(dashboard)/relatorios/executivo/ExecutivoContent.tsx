"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { formatMonthLabel } from "@/lib/relatorios-helpers";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/ui/section-skeleton";
import { PIE_COLORS, CHART_SERIES } from "@/lib/chart-palette";
import {
  TrendingUp, TrendingDown, DollarSign, Wrench, CheckCircle,
  UtensilsCrossed, AlertTriangle, Ban, Receipt, Package, LayoutDashboard,
  BarChart3, PieChart as PieChartIcon,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Button } from "@/components/ui/button";

interface ExecutivoData {
  month: string;
  cards: {
    receitaMes: number;
    despesaMes: number;
    saldoMes: number;
    osAbertas: number;
    osConcluidasMes: number;
    pedidosEntreguesMes: number;
    contasVencidas: number;
    produtosBaixo: number;
    produtosZerados: number;
    ticketMedioCardapio: number;
    valorTotalEstoque: number;
  };
  charts: {
    receitaDespesaDiaria: { date: string; receita: number; despesa: number }[];
    receitaPorOrigem: { origem: string; valor: number }[];
  };
  activeModules: {
    finance: boolean;
    menu: boolean;
    inventory: boolean;
    service_orders: boolean;
  };
}

const ORIGEM_LABELS: Record<string, string> = {
  os: "OS",
  cardapio: "Cardápio",
  manual: "Manual",
};

export function ExecutivoContent() {
  const searchParams = useSearchParams();
  const month = searchParams.get("month") || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const [data, setData] = useState<ExecutivoData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/relatorios/executivo?month=${month}`);
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
        <PageSkeleton statCards={8} sections={2} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <EmptyState
          icon={LayoutDashboard}
          title="Nenhum dado disponível"
          description="Selecione um mês para visualizar o relatório executivo."
        />
      </div>
    );
  }

  const { cards, charts, activeModules } = data;

  const statItems = [];
  if (activeModules.finance) {
    statItems.push(
      { label: "Receita do Mês", value: cards.receitaMes, prefix: "R$ ", icon: TrendingUp, tone: "success" as const },
      { label: "Despesa do Mês", value: cards.despesaMes, prefix: "R$ ", icon: TrendingDown, tone: "danger" as const },
      { label: "Saldo do Mês", value: cards.saldoMes, prefix: "R$ ", icon: DollarSign, tone: cards.saldoMes >= 0 ? "success" as const : "danger" as const },
      { label: "Contas Vencidas", value: cards.contasVencidas, prefix: "", icon: AlertTriangle, tone: cards.contasVencidas > 0 ? "danger" as const : "default" as const },
    );
  }
  if (activeModules.service_orders) {
    statItems.push(
      { label: "OS Abertas", value: cards.osAbertas, prefix: "", icon: Wrench, tone: "info" as const },
      { label: "OS Concluídas", value: cards.osConcluidasMes, prefix: "", icon: CheckCircle, tone: "success" as const },
    );
  }
  if (activeModules.menu) {
    statItems.push(
      { label: "Pedidos Entregues", value: cards.pedidosEntreguesMes, prefix: "", icon: UtensilsCrossed, tone: "success" as const },
      { label: "Ticket Médio", value: cards.ticketMedioCardapio, prefix: "R$ ", icon: Receipt, tone: "info" as const },
    );
  }
  if (activeModules.inventory) {
    statItems.push(
      { label: "Estoque Baixo", value: cards.produtosBaixo, prefix: "", icon: AlertTriangle, tone: cards.produtosBaixo > 0 ? "warning" as const : "default" as const },
      { label: "Produtos Zerados", value: cards.produtosZerados, prefix: "", icon: Ban, tone: cards.produtosZerados > 0 ? "danger" as const : "default" as const },
      { label: "Valor em Estoque", value: cards.valorTotalEstoque, prefix: "R$ ", icon: Package, tone: "success" as const },
    );
  }

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
          <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Relatório Executivo</h1>
          <p className="text-base text-muted-foreground mt-2 font-medium">{formatMonthLabel(month)}</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 px-3.5 rounded-lg border-border/80 hover:bg-muted/50 transition-all duration-150" onClick={loadData}>
          Atualizar
        </Button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
        {activeModules.finance && (
          <>
            <div className="rounded-2xl border border-border/60 border-t-2 border-t-violet-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="px-6 py-5 bg-violet-50/40 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Receita x Despesa por Dia</h2>
                    <p className="text-base text-muted-foreground">Comparativo diário no período</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {charts.receitaDespesaDiaria.length === 0 ? (
                  <EmptyState
                    variant="compact"
                    title="Nenhum dado"
                    description="Não há dados financeiros no período."
                  />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts.receitaDespesaDiaria}>
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
                        <Bar dataKey="receita" name="Receita" fill={CHART_SERIES.receita} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="despesa" name="Despesa" fill={CHART_SERIES.despesa} radius={[4, 4, 0, 0]} />
                      </BarChart>
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
                    <h2 className="text-lg font-bold text-foreground">Receita por Origem</h2>
                    <p className="text-base text-muted-foreground">De onde vem sua receita</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {charts.receitaPorOrigem.length === 0 ? (
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
                          data={charts.receitaPorOrigem}
                          dataKey="valor"
                          nameKey="origem"
                          cx="50%" cy="50%"
                          outerRadius={80}
                          label={({ name, percent }: { name?: string; percent?: number }) =>
                            `${ORIGEM_LABELS[name || ""] || name} ${(percent! * 100).toFixed(0)}%`
                          }
                        >
                          {charts.receitaPorOrigem.map((_, idx) => (
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
          </>
        )}
      </div>
    </div>
  );
}
