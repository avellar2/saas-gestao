"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/lib/menu-helpers";
import { getStatusLabel } from "@/lib/status-palette";
import { Button } from "@/components/ui/button";
import { Clock, UtensilsCrossed, Store, ChevronRight, XCircle, Banknote, Smartphone, CreditCard, ArrowLeftRight, HelpCircle } from "lucide-react";

const PAYMENT_ICONS: Record<string, React.ElementType> = {
  CASH: Banknote,
  PIX: Smartphone,
  CARD: CreditCard,
  TRANSFER: ArrowLeftRight,
  OTHER: HelpCircle,
};

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
  { key: "RECEIVED", color: "bg-blue-500" },
  { key: "PREPARING", color: "bg-amber-500" },
  { key: "READY", color: "bg-emerald-500" },
  { key: "DELIVERED", color: "bg-zinc-500" },
];

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
  const [paymentDialog, setPaymentDialog] = useState<{
    orderId: string;
    orderNumber: number;
  } | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

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
    // Se for DELIVERED, abre dialog de pagamento
    if (newStatus === "DELIVERED") {
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        setPaymentDialog({ orderId, orderNumber: order.orderNumber });
        setSelectedPayment("");
      }
      return;
    }

    await sendStatusChange(orderId, newStatus);
  }

  async function sendStatusChange(orderId: string, newStatus: string, paymentMethod?: string) {
    try {
      const body: Record<string, unknown> = { status: newStatus };
      if (paymentMethod) body.paymentMethod = paymentMethod;

      const res = await fetch(`/api/cardapio/pedidos/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await loadOrders();
      }
    } catch {
      // silently fail
    }
  }

  async function handleConfirmPayment() {
    if (!paymentDialog || !selectedPayment) return;
    setSubmitting(true);
    await sendStatusChange(paymentDialog.orderId, "DELIVERED", selectedPayment);
    setSubmitting(false);
    setPaymentDialog(null);
    setSelectedPayment("");
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
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Cozinha</h1>
        <Button variant="outline" size="sm" onClick={loadOrders} className="rounded-lg h-9 border-border/80 hover:bg-muted/50 transition-all duration-150">
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
                <h2 className="font-semibold text-sm">{getStatusLabel("menuOrder", col.key)}</h2>
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

      {/* Dialog de pagamento */}
      {paymentDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl shadow-lg w-full max-w-sm mx-4 p-6 space-y-4">
            <h3 className="text-lg font-bold">
              Pagamento — Pedido #{paymentDialog.orderNumber}
            </h3>
            <p className="text-sm text-muted-foreground">
              Selecione a forma de pagamento:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PAYMENT_METHOD_LABELS).map(([method, label]) => {
                const Icon = PAYMENT_ICONS[method] || HelpCircle;
                return (
                  <button
                    key={method}
                    onClick={() => setSelectedPayment(method)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-sm font-medium transition-colors ${
                      selectedPayment === method
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setPaymentDialog(null);
                  setSelectedPayment("");
                }}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmPayment}
                disabled={!selectedPayment || submitting}
              >
                {submitting ? "Confirmando..." : "Confirmar Entrega"}
              </Button>
            </div>
          </div>
        </div>
      )}
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
              {getStatusLabel("menuOrder", status)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
