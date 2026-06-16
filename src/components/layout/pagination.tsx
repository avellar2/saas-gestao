"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface PaginationProps {
  /** Página atual (1-based) */
  page: number;
  /** Total de páginas */
  totalPages: number;
  /** Total de itens (opcional, para exibir info) */
  totalItems?: number;
  /** Itens por página */
  itemsPerPage?: number;
  /** Callback quando muda de página */
  onPageChange?: (page: number) => void;
  /** URL base para Link (opcional, ex: "/usuarios?page=") */
  hrefBase?: string;
  /** Classe adicional */
  className?: string;
  /** Se true, desabilita botões durante loading */
  loading?: boolean;
}

/**
 * Pagination - Paginação padronizada
 *
 * Suporta tanto callback quanto Link (modo controle ou URL).
 *
 * @example
 * // Modo controle
 * <Pagination
 *   page={page}
 *   totalPages={10}
 *   onPageChange={setPage}
 * />
 *
 * // Modo Link
 * <Pagination
 *   page={page}
 *   totalPages={10}
 *   hrefBase="/usuarios?page="
 * />
 */
export function Pagination({
  page,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  hrefBase,
  className,
  loading = false,
}: PaginationProps) {
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  const startItem = totalItems ? (page - 1) * (itemsPerPage || 10) + 1 : null;
  const endItem = totalItems
    ? Math.min(page * (itemsPerPage || 10), totalItems)
    : null;

  const handlePrevious = () => {
    if (hasPrevious && onPageChange) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (hasNext && onPageChange) {
      onPageChange(page + 1);
    }
  };

  const PreviousButton = (
    <Button
      variant="outline"
      size="sm"
      disabled={!hasPrevious || loading}
      onClick={hrefBase ? undefined : handlePrevious}
      className="h-8 gap-1"
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="hidden sm:inline">Anterior</span>
    </Button>
  );

  const NextButton = (
    <Button
      variant="outline"
      size="sm"
      disabled={!hasNext || loading}
      onClick={hrefBase ? undefined : handleNext}
      className="h-8 gap-1"
    >
      <span className="hidden sm:inline">Próxima</span>
      <ChevronRight className="h-4 w-4" />
    </Button>
  );

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4",
        "flex-col sm:flex-row",
        className
      )}
    >
      {/* Info */}
      <div className="text-sm text-muted-foreground">
        {totalItems !== undefined ? (
          <>
            Mostrando <span className="font-medium text-foreground">{startItem}</span>
            {" "}a <span className="font-medium text-foreground">{endItem}</span>
            {" "}de <span className="font-medium text-foreground">{totalItems}</span>
            {" "}resultados
          </>
        ) : (
          <>
            Página <span className="font-medium text-foreground">{page}</span>
            {" "}de{" "}
            <span className="font-medium text-foreground">{totalPages}</span>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {hrefBase ? (
          <>
            <Link
              href={hasPrevious ? `${hrefBase}${page - 1}` : "#"}
              className={cn(!hasPrevious && "pointer-events-none")}
            >
              {PreviousButton}
            </Link>
            <Link
              href={hasNext ? `${hrefBase}${page + 1}` : "#"}
              className={cn(!hasNext && "pointer-events-none")}
            >
              {NextButton}
            </Link>
          </>
        ) : (
          <>
            {PreviousButton}
            {NextButton}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * PaginationSimple - Versão minimalista
 *
 * Apenas anterior/próxima sem info.
 */
interface PaginationSimpleProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PaginationSimple({
  page,
  totalPages,
  onPageChange,
  className,
}: PaginationSimpleProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <span className="text-sm text-muted-foreground min-w-[60px] text-center">
        {page} / {totalPages}
      </span>

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
