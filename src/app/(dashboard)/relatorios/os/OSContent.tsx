"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { formatMonthLabel } from "@/lib/relatorios-helpers";
import { getStatusLabel } from "@/lib/os-status";
import { Wrench, CheckCircle, XCircle, TrendingUp, DollarSign, Users, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

interface OSData {
  month: string;
  resumo: {
    total: number;
    abertas: number;
    concluidas: number;
    canceladas: number;
    receitaGerada: number;
    ticketMedio: number;
  };
  statusDistribution: { status: string; count: number }[];
  topClientes: { cliente: string; receita: number; os: number }[];
  porTecnico: { tecnico: string; total: number; concluidas: number }[];
}

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];

export function OSContent() {
  const searchParams = useSearchParams();
  const month = searchParams.get("month") || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const [data, setData] = useState<OSData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/relatorios/os?month=${month}`);
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
        <Wrench className="h-16 w-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Nenhum dado de OS disponível</p>
      </div>
    );
  }

  const { resumo, statusDistribution, topClientes, porTecnico } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{formatMonthLabel(month)}</p>
        <button
          onClick={loadData}
          className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          Atualizar
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            Total no Mês
          </div>
          <p className="text-2xl font-bold">{resumo.total}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wrench className="h-4 w-4 text-blue-500" />
            Abertas
          </div>
          <p className="text-2xl font-bold text-blue-600">{resumo.abertas}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            Concluídas
          </div>
          <p className="text-2xl font-bold text-emerald-600">{resumo.concluidas}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <XCircle className="h-4 w-4 text-destructive" />
            Canceladas
          </div>
          <p className="text-2xl font-bold text-destructive">{resumo.canceladas}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            Receita Gerada
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(resumo.receitaGerada)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            Ticket Médio
          </div>
          <p className="text-2xl font-bold">{formatCurrency(resumo.ticketMedio)}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Status */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Distribuição por Status</h2>
          {statusDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma OS.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%" cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${getStatusLabel((name || "") as never)} ${(percent! * 100).toFixed(0)}%`
                    }
                  >
                    {statusDistribution.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Clientes */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Top Clientes por Receita</h2>
          {topClientes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente no período.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClientes} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="cliente" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(value: unknown) => formatCurrency(value as number)} />
                  <Bar dataKey="receita" name="Receita" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Tabela: Por Técnico */}
      {porTecnico.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              OS por Técnico
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left p-3 font-medium">Técnico</th>
                  <th className="text-right p-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {porTecnico.map((t, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{t.tecnico}</td>
                    <td className="p-3 text-right">{t.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
