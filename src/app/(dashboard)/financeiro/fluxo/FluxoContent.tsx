"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/ui/section-skeleton";
import { CHART_SERIES } from "@/lib/chart-palette";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, DollarSign, ArrowUpFromLine, ArrowDownFromLine } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FluxoDay {
  date: string;
  receivable: number;
  payable: number;
  balance: number;
  accumulated: number;
}

interface FluxoData {
  start: string;
  end: string;
  days: FluxoDay[];
}

export function FluxoContent() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [start, setStart] = useState(firstDay.toISOString().slice(0, 10));
  const [end, setEnd] = useState(lastDay.toISOString().slice(0, 10));
  const [data, setData] = useState<FluxoData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFluxo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/financeiro/fluxo-caixa?start=${start}&end=${end}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    loadFluxo();
  }, [loadFluxo]);

  const totalReceivable = data?.days.reduce((s, d) => s + d.receivable, 0) || 0;
  const totalPayable = data?.days.reduce((s, d) => s + d.payable, 0) || 0;
  const finalAccumulated = data?.days[data.days.length - 1]?.accumulated || 0;

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <PageSkeleton statCards={3} sections={2} />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Fluxo de Caixa</h1>
          <p className="text-base text-muted-foreground mt-2 font-medium">Acompanhe entradas, saídas e saldo acumulado</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 px-3.5 rounded-lg border-border/80 hover:bg-muted/50 transition-all duration-150" onClick={loadFluxo}>
          Atualizar
        </Button>
      </div>

      {/* Filtro de período */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-muted-foreground">De:</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="h-9 rounded-lg border border-border/60 bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-muted-foreground">Até:</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="h-9 rounded-lg border border-border/60 bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
          />
        </div>
      </div>

      {!data || data.days.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Nenhum movimento no período"
          description="Selecione outro período ou aguarde novas transações pagas."
        />
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="px-5 py-4 bg-emerald-50/40 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <ArrowUpFromLine className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Total de Entradas</span>
                </div>
              </div>
              <div className="p-5">
                <p className="text-3xl font-extrabold tracking-tight tabular-nums text-emerald-600">{formatCurrency(totalReceivable)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="px-5 py-4 bg-emerald-50/40 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <ArrowDownFromLine className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Total de Saídas</span>
                </div>
              </div>
              <div className="p-5">
                <p className="text-3xl font-extrabold tracking-tight tabular-nums text-red-600">{formatCurrency(totalPayable)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="px-5 py-4 bg-emerald-50/40 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Saldo Final</span>
                </div>
              </div>
              <div className="p-5">
                <p className={`text-3xl font-extrabold tracking-tight tabular-nums ${finalAccumulated >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(finalAccumulated)}</p>
              </div>
            </div>
          </div>

          {/* Gráfico */}
          <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="px-6 py-5 bg-emerald-50/40 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Evolução do Saldo</h2>
                  <p className="text-base text-muted-foreground">Entradas, saídas e saldo acumulado</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.days}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                    <Tooltip
                      formatter={(value: unknown) => formatCurrency(value as number)}
                      labelFormatter={(label: unknown) =>
                        new Date(label as string).toLocaleDateString("pt-BR")
                      }
                    />
                    <Bar dataKey="receivable" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="payable" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="px-6 py-5 bg-emerald-50/40 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Movimentação Diária</h2>
                  <p className="text-base text-muted-foreground">Detalhamento por dia</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/25 hover:bg-muted/25 border-b border-border/40">
                    <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Data</TableHead>
                    <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">Entradas</TableHead>
                    <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">Saídas</TableHead>
                    <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">Saldo do Dia</TableHead>
                    <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">Acumulado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.days.map((day) => (
                    <TableRow key={day.date} className="group border-b border-border/30 transition-colors duration-150 hover:bg-emerald-50/30 last:border-b-0">
                      <TableCell className="py-3 px-4 text-sm font-medium text-foreground">
                        {new Date(day.date).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-sm text-emerald-600 font-medium text-right tabular-nums">
                        {formatCurrency(day.receivable)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-sm text-red-600 font-medium text-right tabular-nums">
                        {formatCurrency(day.payable)}
                      </TableCell>
                      <TableCell className={`py-3 px-4 text-sm font-medium text-right tabular-nums ${
                        day.balance >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}>
                        {formatCurrency(day.balance)}
                      </TableCell>
                      <TableCell className={`py-3 px-4 text-sm font-medium text-right tabular-nums ${
                        day.accumulated >= 0 ? "text-blue-600" : "text-red-600"
                      }`}>
                        {formatCurrency(day.accumulated)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
