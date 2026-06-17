"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { formatMonthLabel } from "@/lib/relatorios-helpers";
import { Users, UserPlus, DollarSign, Wrench } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

interface ClientesData {
  month: string;
  resumo: {
    total: number;
    novosNoPeriodo: number;
  };
  topClientesReceita: { cliente: string; receita: number; os: number }[];
  clientesMaisOS: { cliente: string; total: number }[];
}

export function ClientesContent() {
  const searchParams = useSearchParams();
  const month = searchParams.get("month") || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const [data, setData] = useState<ClientesData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/relatorios/clientes?month=${month}`);
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
        <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Nenhum dado de clientes disponível</p>
      </div>
    );
  }

  const { resumo, topClientesReceita, clientesMaisOS } = data;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/60 border-t-2 border-t-violet-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 bg-violet-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-violet-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">Total de Clientes</span>
            </div>
          </div>
          <div className="p-5">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">{resumo.total}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 border-t-2 border-t-violet-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 bg-violet-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-violet-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">Novos no Período</span>
            </div>
          </div>
          <div className="p-5">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums text-emerald-600">{resumo.novosNoPeriodo}</p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clientes por Receita */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            Top Clientes por Receita
          </h2>
          {topClientesReceita.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente no período.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClientesReceita} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="cliente" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(value: unknown) => formatCurrency(value as number)} />
                  <Bar dataKey="receita" name="Receita" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Clientes com Mais OS */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Wrench className="h-4 w-4 text-purple-500" />
            Clientes com Mais OS
          </h2>
          {clientesMaisOS.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma OS registrada.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientesMaisOS} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="cliente" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="total" name="Total OS" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
