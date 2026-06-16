/**
 * Status Palette - Centralização de cores e labels para status
 *
 * Este arquivo padroniza o visual de status em todo o sistema
 * sem alterar os enums ou status existentes.
 *
 * Compatível com: os-status.ts (mantém imports existentes intactos)
 */

import type { LucideIcon } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de status suportados
// ─────────────────────────────────────────────────────────────────────────────

export type StatusKind =
  | "serviceOrder"
  | "serviceOrderPriority"
  | "quote"
  | "finance"
  | "payment"
  | "stock"
  | "menuOrder"
  | "module"
  | "generic";

// ─────────────────────────────────────────────────────────────────────────────
// Configuração de cores (light/dark)
// ─────────────────────────────────────────────────────────────────────────────

export interface StatusConfig {
  label: string;
  // Classes Tailwind para o visual do badge
  variant: string;
  // Ícone opcional (Lucide)
  icon?: LucideIcon;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Order Status
// ─────────────────────────────────────────────────────────────────────────────

export const SERVICE_ORDER_STATUS_CONFIG: Record<string, StatusConfig> = {
  RECEIVED: {
    label: "Recebida",
    variant: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  DIAGNOSIS: {
    label: "Em Diagnóstico",
    variant: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  WAITING_APPROVAL: {
    label: "Aguardando Aprovação",
    variant: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  WAITING_PARTS: {
    label: "Aguardando Peças",
    variant: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  IN_PROGRESS: {
    label: "Em Execução",
    variant: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  },
  READY: {
    label: "Pronta",
    variant: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  DELIVERED: {
    label: "Entregue",
    variant: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  COMPLETED: {
    label: "Concluída",
    variant: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400",
  },
  CANCELLED: {
    label: "Cancelada",
    variant: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Service Order Priority
// ─────────────────────────────────────────────────────────────────────────────

export const SERVICE_ORDER_PRIORITY_CONFIG: Record<string, StatusConfig> = {
  LOW: {
    label: "Baixa",
    variant: "bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400",
  },
  NORMAL: {
    label: "Normal",
    variant: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  HIGH: {
    label: "Alta",
    variant: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  URGENT: {
    label: "Urgente",
    variant: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Quote Status
// ─────────────────────────────────────────────────────────────────────────────

export const QUOTE_STATUS_CONFIG: Record<string, StatusConfig> = {
  DRAFT: {
    label: "Rascunho",
    variant: "bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400",
  },
  SENT: {
    label: "Enviado",
    variant: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  ACCEPTED: {
    label: "Aceito",
    variant: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  REJECTED: {
    label: "Rejeitado",
    variant: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  EXPIRED: {
    label: "Expirado",
    variant: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400",
  },
  CONVERTED: {
    label: "Convertido",
    variant: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Finance Status (fluxo de caixa)
// ─────────────────────────────────────────────────────────────────────────────

export const FINANCE_STATUS_CONFIG: Record<string, StatusConfig> = {
  RECEIVED: {
    label: "Receita",
    variant: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  PAID: {
    label: "Despesa",
    variant: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  PENDING: {
    label: "Pendente",
    variant: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Payment Status
// ─────────────────────────────────────────────────────────────────────────────

export const PAYMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  PENDING: {
    label: "Pendente",
    variant: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  PARTIAL: {
    label: "Parcial",
    variant: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  PAID: {
    label: "Pago",
    variant: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  CANCELLED: {
    label: "Cancelado",
    variant: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Stock Status
// ─────────────────────────────────────────────────────────────────────────────

export const STOCK_STATUS_CONFIG: Record<string, StatusConfig> = {
  IN_STOCK: {
    label: "Em Estoque",
    variant: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  LOW_STOCK: {
    label: "Estoque Baixo",
    variant: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  OUT_OF_STOCK: {
    label: "Sem Estoque",
    variant: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  MOVEMENT_IN: {
    label: "Entrada",
    variant: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  MOVEMENT_OUT: {
    label: "Saída",
    variant: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  ADJUSTMENT: {
    label: "Ajuste",
    variant: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Menu Order Status
// ─────────────────────────────────────────────────────────────────────────────

export const MENU_ORDER_STATUS_CONFIG: Record<string, StatusConfig> = {
  PENDING: {
    label: "Pendente",
    variant: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  PREPARING: {
    label: "Preparando",
    variant: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  READY: {
    label: "Pronto",
    variant: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  DELIVERED: {
    label: "Entregue",
    variant: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  CANCELLED: {
    label: "Cancelado",
    variant: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Module Status
// ─────────────────────────────────────────────────────────────────────────────

export const MODULE_STATUS_CONFIG: Record<string, StatusConfig> = {
  ACTIVE: {
    label: "Ativo",
    variant: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  INACTIVE: {
    label: "Inativo",
    variant: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400",
  },
  PENDING: {
    label: "Pendente",
    variant: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  TRIAL: {
    label: "Trial",
    variant: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  EXPIRED: {
    label: "Expirado",
    variant: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Generic Status (para uso geral)
// ─────────────────────────────────────────────────────────────────────────────

export const GENERIC_STATUS_CONFIG: Record<string, StatusConfig> = {
  SUCCESS: {
    label: "Sucesso",
    variant: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  ERROR: {
    label: "Erro",
    variant: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  WARNING: {
    label: "Atenção",
    variant: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  INFO: {
    label: "Info",
    variant: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  NEUTRAL: {
    label: "Neutro",
    variant: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Mapeamento por kind
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_PALETTE: Record<StatusKind, Record<string, StatusConfig>> = {
  serviceOrder: SERVICE_ORDER_STATUS_CONFIG,
  serviceOrderPriority: SERVICE_ORDER_PRIORITY_CONFIG,
  quote: QUOTE_STATUS_CONFIG,
  finance: FINANCE_STATUS_CONFIG,
  payment: PAYMENT_STATUS_CONFIG,
  stock: STOCK_STATUS_CONFIG,
  menuOrder: MENU_ORDER_STATUS_CONFIG,
  module: MODULE_STATUS_CONFIG,
  generic: GENERIC_STATUS_CONFIG,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtém a configuração de um status
 */
export function getStatusConfig(
  kind: StatusKind,
  value: string
): StatusConfig | null {
  const palette = STATUS_PALETTE[kind];
  return palette?.[value] ?? null;
}

/**
 * Obtém o label de um status
 */
export function getStatusLabel(kind: StatusKind, value: string): string {
  return getStatusConfig(kind, value)?.label ?? value;
}

/**
 * Obtém as classes CSS de um status
 */
export function getStatusVariant(kind: StatusKind, value: string): string {
  return (
    getStatusConfig(kind, value)?.variant ??
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400"
  );
}
