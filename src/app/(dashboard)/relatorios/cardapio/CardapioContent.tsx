"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { formatMonthLabel } from "@/lib/relatorios-helpers";
import { PAYMENT_METHOD_LABELS } from "@/lib/menu-helpers";
import { UtensilsCrossed, XCircle, DollarSign, TrendingUp, ShoppingBag } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

interface CardapioData {
  month: string;
  resumo: {
    pedidosEntregues: number;
    pedidosCancelados: number;
    receita: number;
    ticketMedio: number;
  };
  vendasPorPagamento: { metodo: string; total: number; valor: number }[];
  itensMaisVendidos: { item: string; quantidade: number; valor: number }[];
  vendasPorDia: { date: string; pedidos: number; valor: number }[];
}

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export function CardapioContent() {
  const searchParams = useSearchParams();
  const month = searchParams.get("month") || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const [data, setData] = useState<CardapioData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/relatorios/cardapio?month=${month}`);
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
    return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <UtensilsCrossed className="h-16 w-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Nenhum dado do cardápio disponível</p>
      </div>
    );
  }

  const { resumo, vendasPorPagamento, itensMaisVendidos, vendasPorDia } = data;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-base text-muted-foreground font-medium">{formatMonthLabel(month)}</p>
        <button
          onClick={loadData}
          className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-card border border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30 transition-all duration-150"
        >
          Atualizar
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/60 border-t-2 border-t-violet-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 bg-violet-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <ShoppingBag className="h-4 w-4 text-violet-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">Pedidos Entregues</span>
            </div>
          </div>
          <div className="p-5">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums text-emerald-600">{resumo.pedidosEntregues}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 border-t-2 border-t-violet-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 bg-violet-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-violet-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">Cancelados</span>
            </div>
          </div>
          <div className="p-5">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums text-red-600">{resumo.pedidosCancelados}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 border-t-2 border-t-violet-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 bg-violet-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-violet-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">Receita</span>
            </div>
          </div>
          <div className="p-5">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums text-emerald-600">{formatCurrency(resumo.receita)}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 border-t-2 border-t-violet-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 bg-violet-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-violet-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">Ticket Médio</span>
            </div>
          </div>
          <div className="p-5">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">{formatCurrency(resumo.ticketMedio)}</p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas por Dia */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Vendas por Dia</h2>
          {vendasPorDia.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda no período.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendasPorDia}>
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
                  <Bar dataKey="pedidos" name="Pedidos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="valor" name="Valor" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Vendas por Forma de Pagamento */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Vendas por Forma de Pagamento</h2>
          {vendasPorPagamento.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda no período.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vendasPorPagamento}
                    dataKey="valor"
                    nameKey="metodo"
                    cx="50%" cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${PAYMENT_METHOD_LABELS[name as keyof typeof PAYMENT_METHOD_LABELS] || name} ${(percent! * 100).toFixed(0)}%`
                    }
                  >
                    {vendasPorPagamento.map((_, idx) => (
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

      {/* Tabela: Itens Mais Vendidos */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Itens Mais Vendidos
          </h2>
        </div>
        {itensMaisVendidos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum item vendido no período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left p-3 font-medium">Item</th>
                  <th className="text-right p-3 font-medium">Quantidade</th>
                  <th className="text-right p-3 font-medium">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {itensMaisVendidos.map((item, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{item.item}</td>
                    <td className="p-3 text-right">{item.quantidade}</td>
                    <td className="p-3 text-right">{formatCurrency(item.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
