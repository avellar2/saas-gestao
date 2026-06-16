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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4 text-blue-500" />
            Total de Clientes
          </div>
          <p className="text-2xl font-bold">{resumo.total}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserPlus className="h-4 w-4 text-emerald-500" />
            Novos no Período
          </div>
          <p className="text-2xl font-bold text-emerald-600">{resumo.novosNoPeriodo}</p>
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
