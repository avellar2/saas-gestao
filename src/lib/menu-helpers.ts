import { randomBytes } from "crypto";

/**
 * Labels amigáveis para formas de pagamento.
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CARD: "Cartão",
  TRANSFER: "Transferência",
  OTHER: "Outro",
};

/**
 * Gera um token opaco para mesa (cuid-like, 25 chars).
 */
export function generateTableToken(): string {
  return randomBytes(20).toString("base64url").slice(0, 25);
}

/**
 * Sanitiza um pedido para resposta pública (sem dados internos).
 */
export function sanitizeMenuOrder(order: {
  id: string;
  companyId: string;
  tableId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  orderType: string;
  status: string;
  total: { toNumber(): number } | number;
  notes: string | null;
  orderNumber: number;
  createdAt: Date;
  updatedAt: Date;
  items?: Array<{
    id: string;
    nameSnapshot: string;
    priceSnapshot: { toNumber(): number } | number;
    quantity: number;
    notes: string | null;
    total: { toNumber(): number } | number;
  }>;
}) {
  return {
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    total: typeof order.total === "number" ? order.total : order.total.toNumber(),
    notes: order.notes,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    createdAt: order.createdAt.toISOString(),
    items: order.items?.map((item) => ({
      name: item.nameSnapshot,
      price: typeof item.priceSnapshot === "number" ? item.priceSnapshot : item.priceSnapshot.toNumber(),
      quantity: item.quantity,
      notes: item.notes,
      total: typeof item.total === "number" ? item.total : item.total.toNumber(),
    })),
  };
}
