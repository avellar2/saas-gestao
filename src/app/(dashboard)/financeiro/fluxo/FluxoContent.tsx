"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart,
} from "recharts";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
        <Button variant="outline" size="sm" onClick={loadFluxo}>
          Atualizar
        </Button>
      </div>

      {/* Filtro de período */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">De:</label>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
        />
        <label className="text-sm font-medium text-muted-foreground">Até:</label>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !data || data.days.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum movimento no período</p>
          <p className="text-sm mt-1">
            Selecione outro período ou aguarde novas transações pagas.
          </p>
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border bg-card p-4 space-y-1">
              <p className="text-sm text-muted-foreground">Total de Entradas</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(totalReceivable)}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-1">
              <p className="text-sm text-muted-foreground">Total de Saídas</p>
              <p className="text-2xl font-bold text-destructive">
                {formatCurrency(totalPayable)}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-1">
              <p className="text-sm text-muted-foreground">Saldo Final</p>
              <p className={`text-2xl font-bold ${finalAccumulated >= 0 ? "text-primary" : "text-destructive"}`}>
                {formatCurrency(finalAccumulated)}
              </p>
            </div>
          </div>

          {/* Gráfico */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h2 className="font-semibold text-sm">Evolução do Saldo</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.days}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => {
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
                  <Bar dataKey="receivable" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="payable" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="accumulated"
                    name="Saldo Acumulado"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-xl border bg-card">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Movimentação Diária</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left p-3 font-medium">Data</th>
                    <th className="text-right p-3 font-medium">Entradas</th>
                    <th className="text-right p-3 font-medium">Saídas</th>
                    <th className="text-right p-3 font-medium">Saldo do Dia</th>
                    <th className="text-right p-3 font-medium">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.days.map((day) => (
                    <tr key={day.date} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium">
                        {new Date(day.date).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-3 text-right text-emerald-600 font-medium">
                        {formatCurrency(day.receivable)}
                      </td>
                      <td className="p-3 text-right text-destructive font-medium">
                        {formatCurrency(day.payable)}
                      </td>
                      <td className={`p-3 text-right font-medium ${
                        day.balance >= 0 ? "text-emerald-600" : "text-destructive"
                      }`}>
                        {formatCurrency(day.balance)}
                      </td>
                      <td className={`p-3 text-right font-medium ${
                        day.accumulated >= 0 ? "text-primary" : "text-destructive"
                      }`}>
                        {formatCurrency(day.accumulated)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
