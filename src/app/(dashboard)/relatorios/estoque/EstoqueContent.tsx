"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { formatMonthLabel } from "@/lib/relatorios-helpers";
import { AlertTriangle, Ban, DollarSign, Package, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

interface EstoqueData {
  month: string;
  resumo: {
    produtosBaixo: number;
    produtosZerados: number;
    valorTotalEstoque: number;
    movimentacoesNoPeriodo: number;
    entradas: number;
    saidas: number;
  };
  produtosBaixoLista: { id: string; nome: string; quantidade: number; minStock: number }[];
  produtosZeradosLista: { id: string; nome: string }[];
  produtosMaisMovimentados: { produto: string; movimentacoes: number; entradas: number; saidas: number }[];
  movimentacoesPorOrigem: { origem: string; total: number }[];
}

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444"];

const ORIGEM_LABELS: Record<string, string> = {
  os: "OS",
  manual: "Manual",
};

export function EstoqueContent() {
  const searchParams = useSearchParams();
  const month = searchParams.get("month") || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const [data, setData] = useState<EstoqueData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/relatorios/estoque?month=${month}`);
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
        <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Nenhum dado de estoque disponível</p>
      </div>
    );
  }

  const { resumo, produtosBaixoLista, produtosZeradosLista, produtosMaisMovimentados, movimentacoesPorOrigem } = data;

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
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Estoque Baixo
          </div>
          <p className={`text-2xl font-bold ${resumo.produtosBaixo > 0 ? "text-amber-600" : ""}`}>
            {resumo.produtosBaixo}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Ban className="h-4 w-4 text-destructive" />
            Zerados
          </div>
          <p className={`text-2xl font-bold ${resumo.produtosZerados > 0 ? "text-destructive" : ""}`}>
            {resumo.produtosZerados}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4 text-cyan-500" />
            Valor em Estoque
          </div>
          <p className="text-2xl font-bold text-cyan-600">{formatCurrency(resumo.valorTotalEstoque)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4 text-purple-500" />
            Movimentações
          </div>
          <p className="text-2xl font-bold">{resumo.movimentacoesNoPeriodo}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
            Entradas
          </div>
          <p className="text-2xl font-bold text-emerald-600">{resumo.entradas}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowDownCircle className="h-4 w-4 text-destructive" />
            Saídas
          </div>
          <p className="text-2xl font-bold text-destructive">{resumo.saidas}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movimentações por Origem */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Movimentações por Origem</h2>
          {movimentacoesPorOrigem.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma movimentação no período.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={movimentacoesPorOrigem}
                    dataKey="total"
                    nameKey="origem"
                    cx="50%" cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${ORIGEM_LABELS[name || ""] || name} ${(percent! * 100).toFixed(0)}%`
                    }
                  >
                    {movimentacoesPorOrigem.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Produtos Mais Movimentados */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Produtos Mais Movimentados</h2>
          {produtosMaisMovimentados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma movimentação no período.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={produtosMaisMovimentados} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="produto" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produtos em Estoque Baixo */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Produtos em Estoque Baixo
            </h2>
          </div>
          {produtosBaixoLista.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum produto com estoque baixo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left p-3 font-medium">Produto</th>
                    <th className="text-right p-3 font-medium">Qtd</th>
                    <th className="text-right p-3 font-medium">Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {produtosBaixoLista.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <Link href={`/estoque/${p.id}`} className="font-medium hover:underline">
                          {p.nome}
                        </Link>
                      </td>
                      <td className="p-3 text-right text-amber-600 font-medium">{p.quantidade}</td>
                      <td className="p-3 text-right text-muted-foreground">{p.minStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Produtos Zerados */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Ban className="h-4 w-4 text-destructive" />
              Produtos Zerados
            </h2>
          </div>
          {produtosZeradosLista.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum produto zerado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left p-3 font-medium">Produto</th>
                  </tr>
                </thead>
                <tbody>
                  {produtosZeradosLista.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <Link href={`/estoque/${p.id}`} className="font-medium hover:underline">
                          {p.nome}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
