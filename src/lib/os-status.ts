import type { ServiceOrderStatus, ServiceOrderPriority, PaymentStatus, PaymentMethod } from "@/generated/prisma/client";

// ── Status ────────────────────────────────────────────────────────────────

export const SERVICE_ORDER_STATUS: { value: ServiceOrderStatus; label: string; variant: string }[] = [
  { value: "RECEIVED", label: "Recebida", variant: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "DIAGNOSIS", label: "Em Diagnóstico", variant: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "WAITING_APPROVAL", label: "Aguardando Aprovação", variant: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "WAITING_PARTS", label: "Aguardando Peças", variant: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "IN_PROGRESS", label: "Em Execução", variant: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  { value: "READY", label: "Pronta", variant: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "DELIVERED", label: "Entregue", variant: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "COMPLETED", label: "Concluída", variant: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
  { value: "CANCELLED", label: "Cancelada", variant: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
];

export const STATUS_TRANSITIONS: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
  RECEIVED: ["DIAGNOSIS", "IN_PROGRESS", "CANCELLED"],
  DIAGNOSIS: ["WAITING_APPROVAL", "IN_PROGRESS", "CANCELLED"],
  WAITING_APPROVAL: ["IN_PROGRESS", "CANCELLED"],
  WAITING_PARTS: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["READY", "WAITING_PARTS", "CANCELLED"],
  READY: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function getStatusLabel(status: ServiceOrderStatus): string {
  return SERVICE_ORDER_STATUS.find(s => s.value === status)?.label ?? status;
}

export function getStatusVariant(status: ServiceOrderStatus): string {
  return SERVICE_ORDER_STATUS.find(s => s.value === status)?.variant ?? "bg-gray-100 text-gray-700";
}

// ── Priority ─────────────────────────────────────────────────────────────

export const SERVICE_ORDER_PRIORITY: { value: ServiceOrderPriority; label: string; variant: string }[] = [
  { value: "LOW", label: "Baixa", variant: "bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400" },
  { value: "NORMAL", label: "Normal", variant: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "HIGH", label: "Alta", variant: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "URGENT", label: "Urgente", variant: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
];

export function getPriorityLabel(priority: ServiceOrderPriority): string {
  return SERVICE_ORDER_PRIORITY.find(p => p.value === priority)?.label ?? priority;
}

export function getPriorityVariant(priority: ServiceOrderPriority): string {
  return SERVICE_ORDER_PRIORITY.find(p => p.value === priority)?.variant ?? "bg-gray-100 text-gray-700";
}

// ── Payment ──────────────────────────────────────────────────────────────

export const PAYMENT_STATUS: { value: PaymentStatus; label: string; variant: string }[] = [
  { value: "PENDING", label: "Pendente", variant: "bg-amber-100 text-amber-700" },
  { value: "PARTIAL", label: "Parcial", variant: "bg-orange-100 text-orange-700" },
  { value: "PAID", label: "Pago", variant: "bg-emerald-100 text-emerald-700" },
  { value: "CANCELLED", label: "Cancelado", variant: "bg-red-100 text-red-700" },
];

export const PAYMENT_METHOD: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "CARD", label: "Cartão" },
  { value: "TRANSFER", label: "Transferência" },
  { value: "OTHER", label: "Outro" },
];

export function getPaymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS.find(p => p.value === status)?.label ?? status;
}

export function getPaymentStatusVariant(status: PaymentStatus): string {
  return PAYMENT_STATUS.find(p => p.value === status)?.variant ?? "bg-gray-100 text-gray-700";
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD.find(p => p.value === method)?.label ?? method;
}

// ── Warranty ─────────────────────────────────────────────────────────────

export function getWarrantyStatus(warrantyEnabled: boolean, warrantyEndDate: Date | null): { label: string; variant: string } {
  if (!warrantyEnabled) return { label: "Sem garantia", variant: "bg-gray-100 text-gray-600" };
  if (!warrantyEndDate) return { label: "Garantia ativa", variant: "bg-emerald-100 text-emerald-700" };
  const now = new Date();
  if (now > new Date(warrantyEndDate)) return { label: "Garantia vencida", variant: "bg-red-100 text-red-700" };
  return { label: "Garantia ativa", variant: "bg-emerald-100 text-emerald-700" };
}

// ── Code ─────────────────────────────────────────────────────────────────

export function generateOSCode(number: number): string {
  return `OS-${String(number).padStart(4, '0')}`;
}