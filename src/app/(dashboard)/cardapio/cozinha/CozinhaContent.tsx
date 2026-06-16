"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Clock, UtensilsCrossed, Store, ChevronRight, XCircle } from "lucide-react";

interface OrderItem {
  id: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  notes: string | null;
  total: number;
}

interface Order {
  id: string;
  orderNumber: number;
  orderType: "TABLE" | "TAKEAWAY";
  status: string;
  total: number;
  notes: string | null;
  customerName: string | null;
  createdAt: string;
  table: { name: string } | null;
  items: OrderItem[];
}

const STATUS_COLUMNS = [
  { key: "RECEIVED", label: "Recebidos", color: "bg-blue-500" },
  { key: "PREPARING", label: "Em Preparo", color: "bg-yellow-500" },
  { key: "READY", label: "Prontos", color: "bg-green-500" },
  { key: "DELIVERED", label: "Entregues", color: "bg-gray-500" },
];

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Recebido",
  PREPARING: "Em Preparo",
  READY: "Pronto",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `há ${hours}h${minutes % 60 > 0 ? `${minutes % 60}min` : ""}`;
}

export function CozinhaContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/cardapio/pedidos?status=RECEIVED,PREPARING,READY,DELIVERED&limit=100"
      );
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 15_000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  async function handleStatusChange(orderId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/cardapio/pedidos/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        await loadOrders();
      }
    } catch {
      // silently fail
    }
  }

  const getOrdersByStatus = (status: string) =>
    orders.filter((o) => o.status === status);

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Carregando pedidos...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cozinha</h1>
        <Button variant="outline" size="sm" onClick={loadOrders}>
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map((col) => {
          const colOrders = getOrdersByStatus(col.key);
          return (
            <div key={col.key} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${col.color}`} />
                <h2 className="font-semibold text-sm">{col.label}</h2>
                <span className="text-xs text-muted-foreground">
                  ({colOrders.length})
                </span>
              </div>

              <div className="space-y-2 min-h-[200px]">
                {colOrders.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Nenhum pedido
                  </p>
                ) : (
                  colOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      allowedTransitions={ALLOWED_TRANSITIONS[order.status] || []}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  allowedTransitions,
  onStatusChange,
}: {
  order: Order;
  allowedTransitions: string[];
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-bold text-lg">#{order.orderNumber}</span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeAgo(order.createdAt)}
        </span>
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {order.orderType === "TABLE" ? (
          <>
            <UtensilsCrossed className="h-3 w-3" />
            {order.table?.name || "Mesa"}
          </>
        ) : (
          <>
            <Store className="h-3 w-3" />
            Para viagem
          </>
        )}
        {order.customerName && (
          <span className="ml-1">— {order.customerName}</span>
        )}
      </div>

      <div className="space-y-1">
        {order.items.map((item) => (
          <div key={item.id} className="text-xs flex justify-between">
            <span>
              {item.quantity}x {item.nameSnapshot}
            </span>
            <span className="text-muted-foreground">
              {formatCurrency(item.total)}
            </span>
          </div>
        ))}
      </div>

      {order.notes && (
        <p className="text-xs text-muted-foreground italic border-t pt-1 mt-1">
          Obs: {order.notes}
        </p>
      )}

      <div className="text-xs font-medium pt-1">
        Total: {formatCurrency(order.total)}
      </div>

      {allowedTransitions.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1 border-t">
          {allowedTransitions.map((status) => (
            <button
              key={status}
              onClick={() => onStatusChange(order.id, status)}
              className={`text-xs px-2 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                status === "CANCELLED"
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {status === "CANCELLED" ? (
                <XCircle className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {STATUS_LABELS[status] || status}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
