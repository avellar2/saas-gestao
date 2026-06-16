/**
 * Verifica se um produto está com estoque baixo.
 */
export function isLowStock(quantity: number, minStock: number): boolean {
  return quantity > 0 && quantity <= minStock;
}

/**
 * Verifica se um produto está zerado.
 */
export function isOutOfStock(quantity: number): boolean {
  return quantity <= 0;
}

/**
 * Status de estoque para exibição.
 */
export type StockStatus = "normal" | "low" | "out";

export function getStockStatus(quantity: number, minStock: number): StockStatus {
  if (isOutOfStock(quantity)) return "out";
  if (isLowStock(quantity, minStock)) return "low";
  return "normal";
}

export const STOCK_STATUS_CONFIG: Record<StockStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  normal: { label: "Normal", variant: "default" },
  low: { label: "Baixo", variant: "secondary" },
  out: { label: "Zerado", variant: "destructive" },
};

/**
 * Labels para tipo de movimentação.
 */
export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  IN: "Entrada",
  OUT: "Saída",
  ADJUSTMENT: "Ajuste",
};

export const MOVEMENT_TYPE_VARIANTS: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  IN: "default",
  OUT: "destructive",
  ADJUSTMENT: "secondary",
};

/**
 * Labels para motivo de movimentação.
 */
export const MOVEMENT_REASON_LABELS: Record<string, string> = {
  SERVICE_ORDER: "Ordem de Serviço",
  PURCHASE: "Compra",
  SALE: "Venda",
  MANUAL_ADJUSTMENT: "Ajuste Manual",
  RETURN: "Devolução",
  LOSS: "Perda",
};

/**
 * Detecta origem de uma movimentação.
 */
export function getMovementOrigin(movement: {
  serviceOrderId: string | null;
}): "os" | "manual" {
  return movement.serviceOrderId ? "os" : "manual";
}

export const ORIGIN_LABELS: Record<string, string> = {
  os: "OS",
  manual: "Manual",
};
