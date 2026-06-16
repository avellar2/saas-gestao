"use client";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import type { LucideIcon } from "lucide-react";

interface DataTableProps {
  /** Conteúdo (geralmente Table completa) */
  children: React.ReactNode;
  /** Título opcional do header */
  title?: string;
  /** Descrição opcional */
  description?: string;
  /** Ações no header */
  actions?: React.ReactNode;
  /** Estado vazio */
  emptyState?: {
    icon?: LucideIcon;
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  /** Se true, exibe estado vazio */
  isEmpty?: boolean;
  /** Classes adicionais */
  className?: string;
  /** Classes para o container interno */
  innerClassName?: string;
}

/**
 * DataTable - Wrapper visual para tabelas
 *
 * Padroniza a aparência de tabelas com:
 * - Borda e sombra consistentes
 * - Header opcional
 * - Scroll horizontal automático
 * - Estado vazio integrado
 *
 * @example
 * <DataTable title="Usuários" actions={<Button>Adicionar</Button>}>
 *   <Table>...</Table>
 * </DataTable>
 */
export function DataTable({
  children,
  title,
  description,
  actions,
  emptyState,
  isEmpty = false,
  className,
  innerClassName,
}: DataTableProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden",
        className
      )}
    >
      {/* Header */}
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border/50">
          <div className="min-w-0">
            {title && (
              <h3 className="text-base font-semibold text-foreground truncate">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className={cn("overflow-x-auto", !isEmpty && innerClassName)}>
        {isEmpty ? (
          <EmptyState
            icon={emptyState?.icon}
            title={emptyState?.title ?? "Nenhum dado"}
            description={emptyState?.description}
            actionLabel={emptyState?.actionLabel}
            onAction={emptyState?.onAction}
          />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/**
 * DataTablePagination - Footer de paginação para DataTable
 */
interface DataTablePaginationProps {
  children: React.ReactNode;
  className?: string;
}

export function DataTablePagination({
  children,
  className,
}: DataTablePaginationProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-5 py-3 border-t border-border/50 bg-muted/20",
        className
      )}
    >
      {children}
    </div>
  );
}
