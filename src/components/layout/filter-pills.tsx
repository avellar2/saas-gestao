"use client";

import { cn } from "@/lib/utils";
import { m } from "framer-motion";

export interface FilterOption {
  /** Valor do filtro */
  value: string;
  /** Label exibido */
  label: string;
  /** Contador opcional (ex: "12") */
  count?: number;
  /** Se true, mostra como ativo mesmo sem ser selecionado */
  default?: boolean;
}

interface FilterPillsProps {
  /** Opções disponíveis */
  options: FilterOption[];
  /** Valor selecionado */
  value: string;
  /** Callback quando muda */
  onChange: (value: string) => void;
  /** Label para opção "Todos" (se quiser incluir automaticamente) */
  allLabel?: string;
  /** Se true, inclui opção "Todos" no início */
  includeAll?: boolean;
  /** Classe adicional */
  className?: string;
  /** Tamanho */
  size?: "sm" | "md";
}

/**
 * FilterPills - Filtros em formato de pills/botões
 *
 * Padrão para filtros de status, tipo, período, etc.
 *
 * @example
 * <FilterPills
 *   options={[
 *     { value: "PENDING", label: "Pendentes", count: 5 },
 *     { value: "PAID", label: "Pagos", count: 12 },
 *   ]}
 *   value={selectedStatus}
 *   onChange={setSelectedStatus}
 *   includeAll
 * />
 */
export function FilterPills({
  options,
  value,
  onChange,
  allLabel = "Todos",
  includeAll = false,
  className,
  size = "md",
}: FilterPillsProps) {
  const allOptions: FilterOption[] = includeAll
    ? [{ value: "ALL", label: allLabel }, ...options]
    : options;

  const sizeClasses = {
    sm: "h-7 px-2.5 text-xs",
    md: "h-9 px-3.5 text-sm",
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {allOptions.map((option) => {
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex items-center gap-1.5 font-medium",
              "rounded-full transition-all duration-160",
              "border",
              sizeClasses[size],
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border/60 hover:border-border hover:bg-muted/50"
            )}
          >
            {isActive && (
              <m.span
                layoutId="filterPillIndicator"
                className="absolute inset-0 bg-primary rounded-full"
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 35,
                }}
              />
            )}
            <span className={cn("relative z-10", isActive && "text-primary-foreground")}>
              {option.label}
            </span>
            {option.count !== undefined && option.count > 0 && (
              <span
                className={cn(
                  "relative z-10 text-xs tabular-nums",
                  isActive
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * FilterChips - Versão compacta tipo chips/tags
 *
 * Menos espaço, mais opções visíveis.
 */
interface FilterChipsProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FilterChips({
  options,
  value,
  onChange,
  className,
}: FilterChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((option) => {
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md",
              "transition-all duration-150",
              isActive
                ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
            )}
          >
            {option.label}
            {option.count !== undefined && option.count > 0 && (
              <span className="text-muted-foreground/70">
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
