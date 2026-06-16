import { Wrench, UtensilsCrossed, Pencil } from "lucide-react";

/**
 * Verifica se uma transação está vencida (visual apenas, sem alterar o banco).
 */
export function isOverdue(
  status: string,
  dueDate: string | Date | null
): boolean {
  if (status !== "PENDING") return false;
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

/**
 * Retorna o status de exibição considerando vencimento visual.
 */
export function displayStatus(
  status: string,
  dueDate: string | Date | null
): string {
  if (isOverdue(status, dueDate)) return "OVERDUE";
  return status;
}

/**
 * Detecta a origem de uma transação financeira.
 */
export function getTransactionOrigin(tx: {
  serviceOrderId: string | null;
  menuOrderId: string | null;
}): "os" | "menu" | "manual" {
  if (tx.serviceOrderId) return "os";
  if (tx.menuOrderId) return "menu";
  return "manual";
}

/**
 * Labels e ícones para cada origem.
 */
export const ORIGIN_CONFIG = {
  os: { label: "OS", icon: Wrench, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
  menu: { label: "Cardápio", icon: UtensilsCrossed, color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30" },
  manual: { label: "Manual", icon: Pencil, color: "text-gray-600 bg-gray-50 dark:bg-gray-950/30" },
} as const;

export type TransactionOrigin = keyof typeof ORIGIN_CONFIG;

/**
 * Formata mês YYYY-MM para exibição.
 */
export function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-");
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${months[parseInt(m, 10) - 1]} ${year}`;
}

/**
 * Retorna o mês atual no formato YYYY-MM.
 */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Retorna o range de datas de um mês YYYY-MM.
 */
export function getMonthRange(month: string): { start: Date; end: Date } {
  const [year, m] = month.split("-").map(Number);
  const start = new Date(year, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, m, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Labels e cores para status financeiro.
 */
export const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Pendente", variant: "secondary" },
  PAID: { label: "Pago", variant: "default" },
  OVERDUE: { label: "Vencido", variant: "destructive" },
  CANCELLED: { label: "Cancelado", variant: "outline" },
};

/**
 * Labels para tipo RECEIVABLE/PAYABLE.
 */
export const TYPE_CONFIG: Record<string, { label: string; variant: "default" | "destructive" }> = {
  RECEIVABLE: { label: "Receber", variant: "default" },
  PAYABLE: { label: "Pagar", variant: "destructive" },
};
