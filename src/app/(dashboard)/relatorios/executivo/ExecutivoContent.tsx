"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { formatMonthLabel } from "@/lib/relatorios-helpers";
import {
  TrendingUp, TrendingDown, DollarSign, Wrench, CheckCircle,
  UtensilsCrossed, AlertTriangle, Ban, Receipt, Package, LayoutDashboard,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

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

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

const ORIGEM_LABELS: Record<string, string> = {
  os: "OS",
  cardapio: "Cardápio",
  manual: "Manual",
};

function CardSkeleton() {
  return <div className="rounded-xl border bg-card p-4 space-y-2 animate-pulse"><div className="h-4 w-24 bg-muted rounded" /><div className="h-8 w-16 bg-muted rounded" /></div>;
}

function ChartSkeleton() {
  return <div className="rounded-xl border bg-card p-4 space-y-3 animate-pulse"><div className="h-4 w-40 bg-muted rounded" /><div className="h-64 bg-muted rounded" /></div>;
}

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
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <LayoutDashboard className="h-16 w-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Nenhum dado disponível</p>
        <p className="text-sm mt-1">Selecione um mês para visualizar o relatório executivo.</p>
      </div>
    );
  }

  const { cards, charts, activeModules } = data;

  interface CardDef {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    valueColor?: string;
    moduleKey?: string;
    moduleActive?: boolean;
  }

  const allCards: CardDef[] = [
    { title: "Receita do Mês", value: formatCurrency(cards.receitaMes), icon: TrendingUp, color: "text-emerald-500", valueColor: "text-emerald-600", moduleKey: "finance", moduleActive: activeModules.finance },
    { title: "Despesa do Mês", value: formatCurrency(cards.despesaMes), icon: TrendingDown, color: "text-destructive", valueColor: "text-destructive", moduleKey: "finance", moduleActive: activeModules.finance },
    { title: "Saldo do Mês", value: formatCurrency(cards.saldoMes), icon: DollarSign, color: cards.saldoMes >= 0 ? "text-emerald-500" : "text-destructive", valueColor: cards.saldoMes >= 0 ? "text-emerald-600" : "text-destructive", moduleKey: "finance", moduleActive: activeModules.finance },
    { title: "OS Abertas", value: cards.osAbertas, icon: Wrench, color: "text-purple-500", moduleKey: "service_orders", moduleActive: activeModules.service_orders },
    { title: "OS Concluídas", value: cards.osConcluidasMes, icon: CheckCircle, color: "text-purple-500", moduleKey: "service_orders", moduleActive: activeModules.service_orders },
    { title: "Pedidos Entregues", value: cards.pedidosEntreguesMes, icon: UtensilsCrossed, color: "text-orange-500", moduleKey: "menu", moduleActive: activeModules.menu },
    { title: "Contas Vencidas", value: cards.contasVencidas, icon: AlertTriangle, color: "text-destructive", valueColor: "text-destructive", moduleKey: "finance", moduleActive: activeModules.finance },
    { title: "Estoque Baixo", value: cards.produtosBaixo, icon: AlertTriangle, color: "text-amber-500", valueColor: cards.produtosBaixo > 0 ? "text-amber-600" : undefined, moduleKey: "inventory", moduleActive: activeModules.inventory },
    { title: "Produtos Zerados", value: cards.produtosZerados, icon: Ban, color: "text-destructive", valueColor: "text-destructive", moduleKey: "inventory", moduleActive: activeModules.inventory },
    { title: "Ticket Médio Cardápio", value: formatCurrency(cards.ticketMedioCardapio), icon: Receipt, color: "text-blue-500", moduleKey: "menu", moduleActive: activeModules.menu },
    { title: "Valor em Estoque", value: formatCurrency(cards.valorTotalEstoque), icon: Package, color: "text-cyan-500", moduleKey: "inventory", moduleActive: activeModules.inventory },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {formatMonthLabel(month)}
        </p>
        <button
          onClick={loadData}
          className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          Atualizar
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {allCards.map((card) => {
          const isInactive = card.moduleKey && !card.moduleActive;
          return (
            <div
              key={card.title}
              className={`rounded-xl border bg-card p-4 space-y-1 ${isInactive ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                  {card.title}
                </div>
                {isInactive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Inativo
                  </span>
                )}
              </div>
              <p className={`text-2xl font-bold ${isInactive ? "text-muted-foreground" : card.valueColor || ""}`}>
                {isInactive ? "—" : card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receita x Despesa por dia */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Receita x Despesa por Dia</h2>
          {charts.receitaDespesaDiaria.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum dado no período.
            </p>
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
                  <Bar dataKey="receita" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesa" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Receita por Origem */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Receita por Origem</h2>
          {charts.receitaPorOrigem.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma receita no período.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.receitaPorOrigem}
                    dataKey="valor"
                    nameKey="origem"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${ORIGEM_LABELS[name || ""] || name} ${(percent! * 100).toFixed(0)}%`
                    }
                  >
                    {charts.receitaPorOrigem.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: unknown) => formatCurrency(value as number)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
