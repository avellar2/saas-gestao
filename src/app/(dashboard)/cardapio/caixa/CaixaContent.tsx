"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/lib/menu-helpers";
import { Button } from "@/components/ui/button";
import {
  Banknote,
  Smartphone,
  CreditCard,
  ArrowLeftRight,
  HelpCircle,
  DollarSign,
  ShoppingBag,
  XCircle,
  TrendingUp,
  Search,
  UtensilsCrossed,
} from "lucide-react";

const PAYMENT_ICONS: Record<string, React.ElementType> = {
  CASH: Banknote,
  PIX: Smartphone,
  CARD: CreditCard,
  TRANSFER: ArrowLeftRight,
  OTHER: HelpCircle,
  UNINFORMED: HelpCircle,
};

interface PaymentSummaryItem {
  method: string;
  label: string;
  amount: number;
  percentage: number;
}

interface CaixaOrder {
  id: string;
  orderNumber: number;
  orderType: "TABLE" | "TAKEAWAY";
  paymentMethod: string | null;
  total: number;
  customerName: string | null;
  table: { name: string } | null;
  paidAt: string | null;
}

interface CaixaData {
  date: string;
  summary: {
    totalSold: number;
    deliveredCount: number;
    cancelledCount: number;
    averageTicket: number;
    byPaymentMethod: PaymentSummaryItem[];
  };
  orders: CaixaOrder[];
}

export function CaixaContent() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [data, setData] = useState<CaixaData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCaixa = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cardapio/caixa?date=${date}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadCaixa();
  }, [loadCaixa]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Caixa do Cardápio</h1>
        <Button variant="outline" size="sm" onClick={loadCaixa} className="rounded-lg h-9 border-border/80 hover:bg-muted/50 transition-all duration-150">
          Atualizar
        </Button>
      </div>

      {/* Filtro de data */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">
          Data:
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 rounded-lg border border-border/60 bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando...
        </div>
      ) : !data || data.orders.length === 0 ? (
        /* Estado vazio */
        <div className="text-center py-16 text-muted-foreground">
          <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhuma venda nesta data</p>
          <p className="text-sm mt-1">
            Selecione outra data ou aguarde novos pedidos.
          </p>
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border/60 border-t-2 border-t-orange-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="px-5 py-4 bg-orange-50/40 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Total Vendido</span>
                </div>
              </div>
              <div className="p-5">
                <p className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">{formatCurrency(data.summary.totalSold)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 border-t-2 border-t-orange-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="px-5 py-4 bg-orange-50/40 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Pedidos Entregues</span>
                </div>
              </div>
              <div className="p-5">
                <p className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">{data.summary.deliveredCount}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 border-t-2 border-t-orange-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="px-5 py-4 bg-orange-50/40 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Cancelados</span>
                </div>
              </div>
              <div className="p-5">
                <p className="text-3xl font-extrabold tracking-tight tabular-nums text-red-600">{data.summary.cancelledCount}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 border-t-2 border-t-orange-500/30 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="px-5 py-4 bg-orange-50/40 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Ticket Médio</span>
                </div>
              </div>
              <div className="p-5">
                <p className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">{formatCurrency(data.summary.averageTicket)}</p>
              </div>
            </div>
          </div>

          {/* Por forma de pagamento */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h2 className="font-semibold">Por Forma de Pagamento</h2>
            {data.summary.byPaymentMethod.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum pagamento registrado.
              </p>
            ) : (
              <div className="space-y-3">
                {data.summary.byPaymentMethod.map((item) => {
                  const Icon = PAYMENT_ICONS[item.method] || HelpCircle;
                  return (
                    <div key={item.method} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span>{item.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">
                            {formatCurrency(item.amount)}
                          </span>
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tabela de pedidos */}
          <div className="rounded-xl border bg-card">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Pedidos Entregues</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left p-3 font-medium">#</th>
                    <th className="text-left p-3 font-medium">Tipo</th>
                    <th className="text-left p-3 font-medium">Pagamento</th>
                    <th className="text-right p-3 font-medium">Total</th>
                    <th className="text-right p-3 font-medium">Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((order) => {
                    const method = order.paymentMethod || "UNINFORMED";
                    const Icon = PAYMENT_ICONS[method] || HelpCircle;
                    const paymentLabel = order.paymentMethod
                      ? PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod
                      : "Não informado";
                    const time = order.paidAt
                      ? new Date(order.paidAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-";

                    return (
                      <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3 font-medium">
                          #{order.orderNumber}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {order.orderType === "TABLE"
                            ? order.table?.name
                              ? `Mesa ${order.table.name}`
                              : "Mesa"
                            : "Viagem"}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{paymentLabel}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {time}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
