"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { formatMonthLabel } from "@/lib/relatorios-helpers";
import { getStatusLabel } from "@/lib/os-status";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/ui/section-skeleton";
import { PIE_COLORS } from "@/lib/chart-palette";
import { Wrench, CheckCircle, XCircle, TrendingUp, DollarSign, Users, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

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
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <PageSkeleton statCards={6} sections={2} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <EmptyState
          icon={Wrench}
          title="Nenhum dado de OS disponível"
          description="Não há ordens de serviço no período selecionado."
        />
      </div>
    );
  }

  const { resumo, statusDistribution, topClientes, porTecnico } = data;

  const statItems = [
    { label: "Total no Mês", value: resumo.total, prefix: "", icon: BarChart3, tone: "default" as const },
    { label: "Abertas", value: resumo.abertas, prefix: "", icon: Wrench, tone: "info" as const },
    { label: "Concluídas", value: resumo.concluidas, prefix: "", icon: CheckCircle, tone: "success" as const },
    { label: "Canceladas", value: resumo.canceladas, prefix: "", icon: XCircle, tone: "danger" as const },
    { label: "Receita Gerada", value: resumo.receitaGerada, prefix: "R$ ", icon: DollarSign, tone: "success" as const },
    { label: "Ticket Médio", value: resumo.ticketMedio, prefix: "R$ ", icon: TrendingUp, tone: "info" as const },
  ];

  const toneClasses: Record<string, string> = {
    success: "text-emerald-600",
    danger: "text-red-600",
    warning: "text-amber-600",
    info: "text-blue-600",
    default: "text-foreground",
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Relatório de Ordens de Serviço</h1>
          <p className="text-base text-muted-foreground mt-2 font-medium">{formatMonthLabel(month)}</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 px-3.5 rounded-lg border-border/80 hover:bg-muted/50 transition-all duration-150" onClick={loadData}>
          Atualizar
        </Button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statItems.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-border/60 border-t-2 border-t-violet-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="px-5 py-4 bg-violet-50/40 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-violet-600" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{s.label}</span>
                </div>
              </div>
              <div className="p-5">
                <p className={`text-3xl font-extrabold tracking-tight tabular-nums ${toneClasses[s.tone]}`}>
                  {s.prefix}{typeof s.value === "number" && s.value % 1 !== 0 ? s.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : s.value.toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border/60 border-t-2 border-t-violet-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-6 py-5 bg-violet-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <PieChartIcon className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Distribuição por Status</h2>
                <p className="text-base text-muted-foreground">Composição das OS no período</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {statusDistribution.length === 0 ? (
              <EmptyState
                variant="compact"
                title="Nenhuma OS"
                description="Não há ordens de serviço no período."
              />
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
        </div>

        <div className="rounded-2xl border border-border/60 border-t-2 border-t-violet-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-6 py-5 bg-violet-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Top Clientes por Receita</h2>
                <p className="text-base text-muted-foreground">Quem mais gerou receita</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {topClientes.length === 0 ? (
              <EmptyState
                variant="compact"
                title="Nenhum cliente"
                description="Não há clientes no período."
              />
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
      </div>

      {/* Tabela: Por Técnico */}
      {porTecnico.length > 0 && (
        <div className="rounded-2xl border border-border/60 border-t-2 border-t-violet-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="px-6 py-5 bg-violet-50/40 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">OS por Técnico</h2>
                <p className="text-base text-muted-foreground">Produtividade da equipe</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/25 hover:bg-muted/25 border-b border-border/40">
                  <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Técnico</TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">Total</TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">Concluídas</TableHead>
                  <TableHead className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">% Concluído</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porTecnico.map((t, i) => (
                  <TableRow key={i} className="group border-b border-border/30 transition-colors duration-150 hover:bg-violet-50/30 last:border-b-0">
                    <TableCell className="py-3 px-4 text-sm font-medium text-foreground">{t.tecnico}</TableCell>
                    <TableCell className="py-3 px-4 text-sm text-right">{t.total}</TableCell>
                    <TableCell className="py-3 px-4 text-sm text-emerald-600 font-medium text-right">{t.concluidas}</TableCell>
                    <TableCell className="py-3 px-4 text-sm text-right">
                      {t.total > 0 ? ((t.concluidas / t.total) * 100).toFixed(0) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
