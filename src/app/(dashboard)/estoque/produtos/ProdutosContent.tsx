"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { getStockStatus, STOCK_STATUS_CONFIG } from "@/lib/estoque-helpers";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/layout/pagination";
import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/ui/section-skeleton";
import Link from "next/link";
import { Package, Search, X, Plus, FileDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  quantity: number;
  minStock: number;
  costPrice: number | null;
  salePrice: number;
  active: boolean;
  description: string | null;
}

const STOCK_FILTERS = [
  { value: "", label: "Todos" },
  { value: "low", label: "Estoque Baixo" },
  { value: "zerados", label: "Zerados" },
  { value: "ativos", label: "Ativos" },
  { value: "inativos", label: "Inativos" },
];

export function ProdutosContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (stockFilter) params.set("stockFilter", stockFilter);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/estoque?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        setTotalPages(data.totalPages);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [search, stockFilter, page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Produtos</h1>
          <p className="text-base text-muted-foreground mt-2 font-medium">Gerencie seu catálogo e níveis de estoque</p>
        </div>
        <div className="flex items-center gap-2.5">
          <a href="/api/exportar?entity=products" download>
            <Button variant="outline" size="sm" className="gap-2 h-9 px-3.5 rounded-lg border-border/80 hover:bg-muted/50 transition-all duration-150">
              <FileDown className="h-4 w-4" />
              Exportar CSV
            </Button>
          </a>
          <Link href="/estoque/novo">
            <Button size="sm" className="gap-2 h-9 px-3.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-all duration-150 active:scale-[0.97]">
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, SKU ou categoria..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-9 rounded-lg border border-border/60 bg-background px-3 pl-9 pr-9 text-sm shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-all"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {STOCK_FILTERS.map((f) => {
            const active = stockFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => { setStockFilter(active ? "" : f.value); setPage(1); }}
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
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum produto encontrado"
          description="Cadastre seu primeiro produto para começar."
          actionLabel="Novo Produto"
          actionHref="/estoque/novo"
        />
      ) : (
        <>
          <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/25 hover:bg-muted/25 border-b border-border/50">
                    <TableHead className="py-3.5 pl-5 pr-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Nome</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">SKU</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">Qtd</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">Estoque Mín</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">Preço Venda</TableHead>
                    <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Status</TableHead>
                    <TableHead className="py-3.5 pl-3 pr-5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => {
                    const qty = Number(p.quantity);
                    const min = Number(p.minStock);
                    const status = getStockStatus(qty, min);
                    const statusCfg = STOCK_STATUS_CONFIG[status];

                    return (
                      <TableRow key={p.id} className="group border-b border-border/30 transition-colors duration-150 cursor-pointer hover:bg-amber-50/30 last:border-b-0">
                        <TableCell className="py-3.5 pl-5 pr-3 text-sm font-medium text-foreground">{p.name}</TableCell>
                        <TableCell className="py-3.5 px-3 text-sm text-muted-foreground">{p.sku || "—"}</TableCell>
                        <TableCell className="py-3.5 px-3 text-sm font-semibold text-right tabular-nums text-foreground">{qty}</TableCell>
                        <TableCell className="py-3.5 px-3 text-sm text-right tabular-nums text-muted-foreground">{min}</TableCell>
                        <TableCell className="py-3.5 px-3 text-sm font-semibold text-right tabular-nums text-foreground">{formatCurrency(Number(p.salePrice))}</TableCell>
                        <TableCell className="py-3.5 px-3 text-sm">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusCfg.classes}`}>
                            {statusCfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 pl-3 pr-5 text-right">
                          <Link href={`/estoque/${p.id}`}>
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground/40 hover:text-amber-600 hover:bg-amber-50 transition-all duration-150">
                              <ChevronRight className="h-4 w-4" />
                            </span>
                          </Link>
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
