"use client";

import { cn } from "@/lib/utils";
import {
  getStatusConfig,
  getStatusLabel,
  getStatusVariant,
  type StatusKind,
} from "@/lib/status-palette";

interface StatusBadgeProps {
  /** Tipo de status (define qual paleta usar) */
  kind: StatusKind;
  /** Valor do status */
  value: string;
  /** Label customizado (sobrescreve o da paleta) */
  label?: string;
  /** Tamanho do badge */
  size?: "sm" | "md" | "lg";
  /** Classes adicionais */
  className?: string;
}

const sizeClasses = {
  sm: "text-[10px] px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
  lg: "text-sm px-2.5 py-1",
};

/**
 * StatusBadge - Badge de status padronizado
 *
 * Componente unificado para exibir status em todo o sistema.
 * Usa a paleta centralizada em status-palette.ts
 *
 * @example
 * <StatusBadge kind="serviceOrder" value="IN_PROGRESS" />
 * <StatusBadge kind="payment" value="PAID" />
 * <StatusBadge kind="generic" value="SUCCESS" />
 */
export function StatusBadge({
  kind,
  value,
  label: customLabel,
  size = "md",
  className,
}: StatusBadgeProps) {
  const config = getStatusConfig(kind, value);
  const label = customLabel ?? getStatusLabel(kind, value);
  const variant = getStatusVariant(kind, value);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap",
        "transition-colors duration-150",
        sizeClasses[size],
        variant,
        className
      )}
    >
      {label}
    </span>
  );
}

/**
 * StatusDot - Indicador de status com dot
 *
 * Similar ao StatusBadge mas com um ponto colorido à esquerda.
 */
interface StatusDotProps {
  kind: StatusKind;
  value: string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusDot({
  kind,
  value,
  label: customLabel,
  size = "md",
  className,
}: StatusDotProps) {
  const label = customLabel ?? getStatusLabel(kind, value);
  const config = getStatusConfig(kind, value);

  // Extrair a cor do variant para o dot
  const variant = getStatusVariant(kind, value);
  const colorClass = variant.match(/text-\w+-\d+/)?.[0] ?? "text-zinc-500";

  const sizeClasses = {
    sm: "text-xs gap-1.5",
    md: "text-sm gap-2",
  };

  return (
    <div className={cn("flex items-center", sizeClasses[size], className)}>
      <span
        className={cn(
          "rounded-full",
          size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2",
          // Usar a cor extraída para o background
          colorClass.replace("text-", "bg-")
        )}
      />
      <span className="text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

/**
 * StatusPill - Status em formato de pill (arredondado)
 *
 * Mais destacado que o badge padrão.
 */
interface StatusPillProps {
  kind: StatusKind;
  value: string;
  label?: string;
  className?: string;
}

export function StatusPill({
  kind,
  value,
  label: customLabel,
  className,
}: StatusPillProps) {
  const label = customLabel ?? getStatusLabel(kind, value);
  const variant = getStatusVariant(kind, value);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        "px-3 py-1 rounded-full text-xs font-semibold",
        "transition-all duration-150",
        variant,
        className
      )}
    >
      {label}
    </span>
  );
}
