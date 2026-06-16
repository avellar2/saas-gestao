"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { getStockStatus, STOCK_STATUS_CONFIG } from "@/lib/estoque-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Package, Search, X, Plus, FileDown } from "lucide-react";

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
      if (stockFilter === "low") params.set("lowStock", "true");
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

  const filteredProducts = products.filter((p) => {
    if (stockFilter === "zerados") return Number(p.quantity) <= 0;
    if (stockFilter === "ativos") return p.active;
    if (stockFilter === "inativos") return !p.active;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <div className="flex items-center gap-2">
          <a href="/api/exportar?entity=products" download>
            <Button variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-1" />
              Exportar CSV
            </Button>
          </a>
          <Link href="/estoque/novo">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Novo Produto
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, SKU ou categoria..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-9 rounded-lg border border-input bg-transparent pl-8 pr-8 text-sm outline-none focus-visible:border-ring"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1); }}
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1">
          {["", "low", "zerados", "ativos", "inativos"].map((f) => (
            <button
              key={f}
              onClick={() => { setStockFilter(f); setPage(1); }}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                stockFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f === "" ? "Todos" : f === "low" ? "Estoque Baixo" : f === "zerados" ? "Zerados" : f === "ativos" ? "Ativos" : "Inativos"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum produto encontrado</p>
          <p className="text-sm mt-1">Cadastre seu primeiro produto para começar.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground text-xs">
                  <th className="text-left p-3 font-medium">Nome</th>
                  <th className="text-left p-3 font-medium">SKU</th>
                  <th className="text-right p-3 font-medium">Qtd</th>
                  <th className="text-right p-3 font-medium">Estoque Mín</th>
                  <th className="text-right p-3 font-medium">Preço Venda</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const qty = Number(p.quantity);
                  const min = Number(p.minStock);
                  const status = getStockStatus(qty, min);
                  const statusCfg = STOCK_STATUS_CONFIG[status];

                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3 text-muted-foreground">{p.sku || "-"}</td>
                      <td className="p-3 text-right">{qty}</td>
                      <td className="p-3 text-right">{min}</td>
                      <td className="p-3 text-right">{formatCurrency(Number(p.salePrice))}</td>
                      <td className="p-3">
                        <Badge variant={statusCfg.variant} className="text-xs">
                          {statusCfg.label}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Link href={`/estoque/${p.id}`}>
                          <Button variant="outline" size="sm">
                            Ver
                          </Button>
                        </Link>
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
