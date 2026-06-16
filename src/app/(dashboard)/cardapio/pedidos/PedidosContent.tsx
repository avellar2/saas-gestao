"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Store, Search, X, DollarSign } from "lucide-react";

interface OrderItem {
  id: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  notes: string | null;
  total: number;
}

interface FinancialTransaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string;
  category: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: number;
  orderType: "TABLE" | "TAKEAWAY";
  status: string;
  total: number;
  notes: string | null;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
  table: { name: string } | null;
  items: OrderItem[];
  transactions?: FinancialTransaction[];
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  RECEIVED: { label: "Recebido", variant: "default" },
  PREPARING: { label: "Em Preparo", variant: "secondary" },
  READY: { label: "Pronto", variant: "outline" },
  DELIVERED: { label: "Entregue", variant: "outline" },
  CANCELLED: { label: "Cancelado", variant: "destructive" },
};

const FINANCE_STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PAID: { label: "Pago", variant: "default" },
  PENDING: { label: "Pendente", variant: "secondary" },
  OVERDUE: { label: "Vencido", variant: "destructive" },
  CANCELLED: { label: "Cancelado", variant: "outline" },
};

export function PedidosContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [financeActive, setFinanceActive] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "100");

      const res = await fetch(`/api/cardapio/pedidos?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        setFinanceActive(data.financeActive ?? false);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      String(o.orderNumber).includes(q) ||
      (o.customerName?.toLowerCase().includes(q) ?? false) ||
      (o.table?.name?.toLowerCase().includes(q) ?? false)
    );
  });

  const hasDeliveredOrders = orders.some((o) => o.status === "DELIVERED");

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <Button variant="outline" size="sm" onClick={loadOrders}>
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por número, cliente ou mesa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg border border-input bg-transparent pl-8 pr-8 text-sm outline-none focus-visible:border-ring"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1">
          {["", "RECEIVED", "PREPARING", "READY", "DELIVERED", "CANCELLED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s ? STATUS_BADGE[s]?.label || s : "Todos"}
            </button>
          ))}
        </div>
      </div>

      {/* Aviso financeiro */}
      {!financeActive && hasDeliveredOrders && (
        <div className="rounded-lg border border-muted bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Ative o Financeiro para lançar receitas automaticamente a partir dos pedidos entregues.
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => {
            const badge = STATUS_BADGE[order.status] || { label: order.status, variant: "default" as const };
            const isExpanded = expandedId === order.id;
            const tx = order.transactions?.[0];

            return (
              <div
                key={order.id}
                className="rounded-lg border bg-card"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold">#{order.orderNumber}</span>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      {order.orderType === "TABLE" ? (
                        <><UtensilsCrossed className="h-3 w-3" />{order.table?.name || "Mesa"}</>
                      ) : (
                        <><Store className="h-3 w-3" />Viagem</>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString("pt-BR")}
                    </span>
                    <span className="font-medium">{formatCurrency(order.total)}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t px-3 py-3 space-y-2">
                    {order.customerName && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Cliente:</span> {order.customerName}
                        {order.customerPhone && ` — ${order.customerPhone}`}
                      </p>
                    )}
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="text-sm flex justify-between">
                          <span>
                            {item.quantity}x {item.nameSnapshot}
                            {item.notes && (
                              <span className="text-muted-foreground ml-1">({item.notes})</span>
                            )}
                          </span>
                          <span className="text-muted-foreground">
                            {formatCurrency(item.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {order.notes && (
                      <p className="text-sm text-muted-foreground italic">
                        Obs: {order.notes}
                      </p>
                    )}

                    {/* Badge financeiro */}
                    {tx && (
                      <div className="flex items-center gap-2 pt-1 border-t">
                        <DollarSign className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-xs text-muted-foreground">
                          Lançamento financeiro gerado —
                        </span>
                        <Badge
                          variant={FINANCE_STATUS_BADGE[tx.status]?.variant || "outline"}
                          className="text-xs"
                        >
                          {FINANCE_STATUS_BADGE[tx.status]?.label || tx.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(Number(tx.amount))}
                        </span>
                        {tx.paidAt && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(tx.paidAt).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
