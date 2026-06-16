"use client";

import { useState, useEffect, useCallback } from "react";
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_VARIANTS, MOVEMENT_REASON_LABELS, getMovementOrigin, ORIGIN_LABELS } from "@/lib/estoque-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, Search, X } from "lucide-react";

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Movimentações</h1>
        <Button variant="outline" size="sm" onClick={loadMovements}>
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {["", "IN", "OUT", "ADJUSTMENT"].map((t) => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(1); }}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                typeFilter === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t ? MOVEMENT_TYPE_LABELS[t] || t : "Todos"}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-border" />

        <div className="flex gap-1">
          {["", "manual", "os"].map((o) => (
            <button
              key={o}
              onClick={() => { setOriginFilter(o); setPage(1); }}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                originFilter === o
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {o ? ORIGIN_LABELS[o] || o : "Todas origens"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : movements.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ArrowLeftRight className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhuma movimentação encontrada</p>
          <p className="text-sm mt-1">Movimentações aparecem aqui quando você faz entradas, saídas ou ajustes.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground text-xs">
                  <th className="text-left p-3 font-medium">Data</th>
                  <th className="text-left p-3 font-medium">Produto</th>
                  <th className="text-left p-3 font-medium">Tipo</th>
                  <th className="text-left p-3 font-medium">Motivo</th>
                  <th className="text-right p-3 font-medium">Qtd</th>
                  <th className="text-right p-3 font-medium">Anterior</th>
                  <th className="text-right p-3 font-medium">Novo</th>
                  <th className="text-left p-3 font-medium">Origem</th>
                  <th className="text-left p-3 font-medium">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const origin = getMovementOrigin(m);
                  return (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="p-3 font-medium">{m.product.name}</td>
                      <td className="p-3">
                        <Badge variant={MOVEMENT_TYPE_VARIANTS[m.type] || "outline"} className="text-xs">
                          {MOVEMENT_TYPE_LABELS[m.type] || m.type}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {MOVEMENT_REASON_LABELS[m.reason] || m.reason}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {m.type === "IN" ? "+" : m.type === "OUT" ? "-" : "±"}
                        {m.quantity}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">{m.previousQuantity}</td>
                      <td className="p-3 text-right text-muted-foreground">{m.newQuantity}</td>
                      <td className="p-3">
                        <Badge variant={origin === "os" ? "secondary" : "outline"} className="text-xs">
                          {ORIGIN_LABELS[origin]}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                        {m.description || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
