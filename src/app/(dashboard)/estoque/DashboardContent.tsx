"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { MOVEMENT_TYPE_LABELS, MOVEMENT_REASON_LABELS, getMovementOrigin, ORIGIN_LABELS } from "@/lib/estoque-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Package, AlertTriangle, Ban, DollarSign, ArrowLeftRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

interface RecentMovement {
  id: string;
  type: string;
  reason: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  description: string | null;
  serviceOrderId: string | null;
  createdAt: string;
  product: { id: string; name: string };
}

interface ResumoData {
  totalAtivos: number;
  totalBaixo: number;
  totalZerados: number;
  valorTotalEstoque: number;
  recentMovements: RecentMovement[];
}

export function DashboardContent() {
  const [data, setData] = useState<ResumoData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadResumo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/estoque/resumo");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResumo();
  }, [loadResumo]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Nenhum dado disponível</p>
      </div>
    );
  }

  // Dados para o gráfico (últimos 7 dias de movimentações)
  const last7Days: Record<string, { date: string; in: number; out: number }> = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    last7Days[key] = { date: key, in: 0, out: 0 };
  }

  for (const m of data.recentMovements) {
    const day = m.createdAt.slice(0, 10);
    if (last7Days[day]) {
      if (m.type === "IN") last7Days[day].in += m.quantity;
      else if (m.type === "OUT") last7Days[day].out += m.quantity;
    }
  }

  const chartData = Object.values(last7Days).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard de Estoque</h1>
        <Button variant="outline" size="sm" onClick={loadResumo}>
          Atualizar
        </Button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            Produtos Ativos
          </div>
          <p className="text-2xl font-bold">{data.totalAtivos}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Estoque Baixo
          </div>
          <p className="text-2xl font-bold text-amber-600">{data.totalBaixo}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Ban className="h-4 w-4 text-destructive" />
            Zerados
          </div>
          <p className="text-2xl font-bold text-destructive">{data.totalZerados}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4 text-primary" />
            Valor em Estoque
          </div>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(data.valorTotalEstoque)}
          </p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-semibold text-sm">Movimentações (últimos 7 dias)</h2>
        {chartData.every((d) => d.in === 0 && d.out === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma movimentação nos últimos 7 dias.
          </p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
                  formatter={(value: unknown) => `${value} unidades`}
                  labelFormatter={(label: unknown) =>
                    new Date(label as string).toLocaleDateString("pt-BR")
                  }
                />
                <Bar dataKey="in" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="out" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Movimentações recentes */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Movimentações Recentes</h2>
          <Link href="/estoque/movimentacoes">
            <Button variant="outline" size="sm">
              Ver todas
            </Button>
          </Link>
        </div>
        {data.recentMovements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma movimentação registrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left p-3 font-medium">Data</th>
                  <th className="text-left p-3 font-medium">Produto</th>
                  <th className="text-left p-3 font-medium">Tipo</th>
                  <th className="text-right p-3 font-medium">Qtd</th>
                </tr>
              </thead>
              <tbody>
                {data.recentMovements.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-3 font-medium">{m.product.name}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          m.type === "IN" ? "default" : m.type === "OUT" ? "destructive" : "secondary"
                        }
                        className="text-xs"
                      >
                        {MOVEMENT_TYPE_LABELS[m.type] || m.type}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-medium">
                      {m.type === "IN" ? "+" : m.type === "OUT" ? "-" : ""}
                      {m.quantity}
                    </td>
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
