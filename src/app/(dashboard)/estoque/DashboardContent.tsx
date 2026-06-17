"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { MOVEMENT_TYPE_LABELS } from "@/lib/estoque-helpers";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/ui/section-skeleton";
import Link from "next/link";
import { CHART_SERIES } from "@/lib/chart-palette";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Package, AlertTriangle, Ban, DollarSign, ArrowLeftRight, TrendingUp, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
          icon={Package}
          title="Nenhum dado disponível"
          description="Não há dados de estoque para exibir."
          actionLabel="Novo Produto"
          actionHref="/estoque/novo"
        />
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

  const getMovementVariant = (type: string) => {
    switch (type) {
      case "IN":
        return "default";
      case "OUT":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Dashboard de Estoque</h1>
          <p className="text-base text-muted-foreground mt-2 font-medium">Visão geral e movimentações recentes</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" className="h-9 px-3.5 rounded-lg border-border/80 hover:bg-muted/50 transition-all duration-150" onClick={loadResumo}>
            Atualizar
          </Button>
          <Link href="/estoque/novo">
            <Button size="sm" className="gap-2 h-9 px-3.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-all duration-150 active:scale-[0.97]">
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/60 border-t-2 border-t-amber-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 bg-amber-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Package className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">Produtos Ativos</span>
            </div>
          </div>
          <div className="p-5">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">{data.totalAtivos}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 border-t-2 border-t-amber-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 bg-amber-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">Estoque Baixo</span>
            </div>
          </div>
          <div className="p-5">
            <p className={`text-3xl font-extrabold tracking-tight tabular-nums ${data.totalBaixo > 0 ? "text-amber-600" : "text-foreground"}`}>{data.totalBaixo}</p>
            {data.totalBaixo > 0 && <p className="text-xs text-muted-foreground mt-1">Atenção: necessita reposição</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 border-t-2 border-t-amber-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 bg-amber-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Ban className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">Zerados</span>
            </div>
          </div>
          <div className="p-5">
            <p className={`text-3xl font-extrabold tracking-tight tabular-nums ${data.totalZerados > 0 ? "text-red-600" : "text-foreground"}`}>{data.totalZerados}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 border-t-2 border-t-amber-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 bg-amber-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">Valor em Estoque</span>
            </div>
          </div>
          <div className="p-5">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">{formatCurrency(data.valorTotalEstoque)}</p>
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="rounded-2xl border border-border/60 border-t-2 border-t-amber-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="px-6 py-5 bg-amber-50/40 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Movimentações (últimos 7 dias)</h2>
              <p className="text-base text-muted-foreground">Entradas e saídas diárias</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {chartData.every((d) => d.in === 0 && d.out === 0) ? (
            <EmptyState
              variant="compact"
              title="Nenhuma movimentação"
              description="Não há movimentações nos últimos 7 dias."
            />
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
                  <Bar dataKey="in" name="Entradas" fill={CHART_SERIES.entradas} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="out" name="Saídas" fill={CHART_SERIES.saidas} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Movimentações recentes */}
      <div className="rounded-2xl border border-border/60 border-t-2 border-t-amber-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="px-6 py-5 bg-amber-50/40 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <ArrowLeftRight className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Movimentações Recentes</h2>
                <p className="text-base text-muted-foreground">Últimas operações registradas</p>
              </div>
            </div>
            <Link href="/estoque/movimentacoes">
              <Button variant="outline" size="sm" className="h-9 px-3.5 rounded-lg border-border/80 hover:bg-muted/50 transition-all duration-150">
                Ver todas
              </Button>
            </Link>
          </div>
        </div>
        {data.recentMovements.length === 0 ? (
          <div className="px-6 py-10">
            <EmptyState
              variant="compact"
              title="Nenhuma movimentação"
              description="Movimentações aparecem aqui quando você faz entradas, saídas ou ajustes."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/25 hover:bg-muted/25 border-b border-border/40">
                  <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Data</TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Produto</TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Tipo</TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">Qtd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentMovements.map((m) => (
                  <TableRow key={m.id} className="group border-b border-border/30 transition-colors duration-150 hover:bg-amber-50/30 last:border-b-0">
                    <TableCell className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-sm font-medium text-foreground">{m.product.name}</TableCell>
                    <TableCell className="py-3 px-4 text-sm">
                      <Badge variant={getMovementVariant(m.type)} className="rounded-full text-xs font-medium">
                        {MOVEMENT_TYPE_LABELS[m.type] || m.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-sm font-medium text-right tabular-nums">
                      {m.type === "IN" ? "+" : m.type === "OUT" ? "-" : "±"}
                      {m.quantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
