"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { formatMonthLabel } from "@/lib/relatorios-helpers";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Clock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line,
} from "recharts";

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

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

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
    return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Nenhum dado financeiro disponível</p>
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Receitas
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(resumo.receitas)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingDown className="h-4 w-4 text-destructive" />
            Despesas
          </div>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(resumo.despesas)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className={`h-4 w-4 ${resumo.saldo >= 0 ? "text-emerald-500" : "text-destructive"}`} />
            Saldo
          </div>
          <p className={`text-2xl font-bold ${resumo.saldo >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {formatCurrency(resumo.saldo)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Vencidas
          </div>
          <p className="text-2xl font-bold text-destructive">{resumo.contasVencidas}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-amber-500" />
            Pendentes
          </div>
          <p className="text-2xl font-bold text-amber-600">{resumo.contasPendentes}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fluxo de caixa diário */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Fluxo de Caixa Diário</h2>
          {dailyData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado no período.</p>
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
                  <Bar dataKey="receita" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesa" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="saldo" name="Saldo Acumulado" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Receitas por Origem */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Receitas por Origem</h2>
          {receitasPorOrigem.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma receita no período.</p>
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

        {/* Despesas por Categoria */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Despesas por Categoria (Top 5)</h2>
          {despesasPorCategoria.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma despesa no período.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={despesasPorCategoria} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="categoria" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(value: unknown) => formatCurrency(value as number)} />
                  <Bar dataKey="valor" name="Valor" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
