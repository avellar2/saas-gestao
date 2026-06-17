"use client";

import { useState, useEffect, useCallback } from "react";
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_VARIANTS, MOVEMENT_REASON_LABELS, getMovementOrigin, ORIGIN_LABELS } from "@/lib/estoque-helpers";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/layout/pagination";
import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/ui/section-skeleton";
import { ArrowLeftRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Movement {
  id: string;
  type: string;
  reason: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  description: string | null;
  serviceOrderId: string | null;
  createdById: string | null;
  createdAt: string;
  product: { id: string; name: string };
  createdBy?: { id: string; name: string } | null;
}

const TYPE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "IN", label: "Entradas" },
  { value: "OUT", label: "Saídas" },
  { value: "ADJUSTMENT", label: "Ajustes" },
];

const ORIGIN_OPTIONS = [
  { value: "", label: "Todas origens" },
  { value: "manual", label: "Manual" },
  { value: "os", label: "OS" },
];

export function MovimentacoesContent() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [originFilter, setOriginFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (originFilter) params.set("origin", originFilter);
      params.set("page", String(page));
      params.set("limit", "30");

      const res = await fetch(`/api/estoque/movimentacoes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMovements(data.movements);
        setTotalPages(data.totalPages);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [typeFilter, originFilter, page]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Movimentações</h1>
          <p className="text-base text-muted-foreground mt-2 font-medium">Histórico de entradas, saídas e ajustes</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 px-3.5 rounded-lg border-border/80 hover:bg-muted/50 transition-all duration-150" onClick={loadMovements}>
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {TYPE_OPTIONS.map((f) => {
          const active = typeFilter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => { setTypeFilter(active ? "" : f.value); setPage(1); }}
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 border cursor-pointer select-none ${
                active
                  ? "bg-amber-50 border-amber-200 text-amber-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30"
              }`}
            >
              {f.label}
            </button>
          );
        })}

        <div className="w-px h-6 bg-border hidden sm:block" />

        {ORIGIN_OPTIONS.map((f) => {
          const active = originFilter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => { setOriginFilter(active ? "" : f.value); setPage(1); }}
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 border cursor-pointer select-none ${
                active
                  ? "bg-amber-50 border-amber-200 text-amber-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : movements.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Nenhuma movimentação encontrada"
          description="Movimentações aparecem aqui quando você faz entradas, saídas ou ajustes."
        />
      ) : (
        <>
          <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/25 hover:bg-muted/25 border-b border-border/50">
                    <TableHead className="py-3.5 pl-5 pr-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Data</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Produto</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Tipo</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Motivo</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">Qtd</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">Anterior</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">Novo</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Origem</TableHead>
                    <TableHead className="py-3.5 pl-3 pr-5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => {
                    const origin = getMovementOrigin(m);
                    return (
                      <TableRow key={m.id} className="group border-b border-border/30 transition-colors duration-150 hover:bg-amber-50/30 last:border-b-0">
                        <TableCell className="py-3.5 pl-5 pr-3 text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="py-3.5 px-3 text-sm font-medium text-foreground">{m.product.name}</TableCell>
                        <TableCell className="py-3.5 px-3 text-sm">
                          <Badge variant={MOVEMENT_TYPE_VARIANTS[m.type] || "outline"} className="rounded-full text-xs font-medium">
                            {MOVEMENT_TYPE_LABELS[m.type] || m.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5 px-3 text-sm text-muted-foreground">
                          {MOVEMENT_REASON_LABELS[m.reason] || m.reason}
                        </TableCell>
                        <TableCell className="py-3.5 px-3 text-sm font-medium text-right tabular-nums">
                          {m.type === "IN" ? "+" : m.type === "OUT" ? "-" : "±"}
                          {m.quantity}
                        </TableCell>
                        <TableCell className="py-3.5 px-3 text-sm text-muted-foreground text-right tabular-nums">{m.previousQuantity}</TableCell>
                        <TableCell className="py-3.5 px-3 text-sm text-muted-foreground text-right tabular-nums">{m.newQuantity}</TableCell>
                        <TableCell className="py-3.5 px-3 text-sm">
                          <Badge variant={origin === "os" ? "secondary" : "outline"} className="rounded-full text-xs font-medium">
                            {ORIGIN_LABELS[origin]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5 pl-3 pr-5 text-sm text-muted-foreground max-w-[200px] truncate">
                          {m.description || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
