"use client";

import { cn } from "@/lib/utils";
import { SkeletonShimmer } from "@/components/ui/skeleton";

/**
 * SectionSkeleton - Skeletons padronizados para seções
 *
 * Substituir gradualmente textos "Carregando..." nas telas.
 */

interface CardSkeletonProps {
  /** Se true, mostra header com título */
  hasHeader?: boolean;
  /** Número de linhas de conteúdo */
  lines?: number;
  /** Classes adicionais */
  className?: string;
}

/**
 * CardSkeleton - Skeleton para cards
 */
export function CardSkeleton({
  hasHeader = true,
  lines = 3,
  className,
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-5 shadow-soft",
        className
      )}
    >
      {hasHeader && (
        <div className="flex items-center justify-between mb-4">
          <SkeletonShimmer className="h-5 w-1/3" />
          <SkeletonShimmer className="h-5 w-5 rounded-md" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonShimmer
            key={i}
            className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")}
          />
        ))}
      </div>
    </div>
  );
}

interface TableSkeletonProps {
  /** Número de linhas */
  rows?: number;
  /** Número de colunas */
  columns?: number;
  /** Se true, mostra header */
  hasHeader?: boolean;
  /** Classes adicionais */
  className?: string;
}

/**
 * TableSkeleton - Skeleton para tabelas
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  hasHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden",
        className
      )}
    >
      {hasHeader && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <SkeletonShimmer className="h-5 w-32" />
          <SkeletonShimmer className="h-8 w-24 rounded-lg" />
        </div>
      )}
      <div className="p-5">
        {/* Header da tabela */}
        <div className="flex gap-4 mb-3">
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonShimmer
              key={`th-${i}`}
              className="h-4 flex-1"
              style={{ flex: i === 0 ? 2 : 1 }}
            />
          ))}
        </div>

        {/* Linhas */}
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <SkeletonShimmer
                  key={`${rowIndex}-${colIndex}`}
                  className="h-4 flex-1"
                  style={{ flex: colIndex === 0 ? 2 : 1 }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface PageSkeletonProps {
  /** Número de cards de stat */
  statCards?: number;
  /** Número de seções */
  sections?: number;
  /** Classes adicionais */
  className?: string;
}

/**
 * PageSkeleton - Skeleton para páginas completas
 */
export function PageSkeleton({
  statCards = 3,
  sections = 2,
  className,
}: PageSkeletonProps) {
  return (
    <div className={cn("space-y-8", className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <SkeletonShimmer className="h-7 w-48" />
          <SkeletonShimmer className="h-4 w-64" />
        </div>
        <SkeletonShimmer className="h-9 w-32 rounded-lg" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: statCards }).map((_, i) => (
          <CardSkeleton key={i} lines={2} />
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {Array.from({ length: sections }).map((_, i) => (
          <CardSkeleton key={i} lines={4} />
        ))}
      </div>
    </div>
  );
}

interface ChartSkeletonProps {
  /** Se true, mostra header */
  hasHeader?: boolean;
  /** Altura do chart */
  height?: number;
  /** Classes adicionais */
  className?: string;
}

/**
 * ChartSkeleton - Skeleton para charts
 */
export function ChartSkeleton({
  hasHeader = true,
  height = 300,
  className,
}: ChartSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card shadow-soft",
        className
      )}
    >
      {hasHeader && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <SkeletonShimmer className="h-5 w-32" />
          <SkeletonShimmer className="h-8 w-20 rounded-lg" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-end justify-between gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonShimmer
              key={i}
              className="rounded-t-lg"
              style={{
                height: `${Math.max(60, Math.random() * height)}px`,
                flex: 1,
              }}
            />
          ))}
        </div>

        {/* Eixo X */}
        <div className="flex justify-between mt-4 px-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonShimmer key={i} className="h-3 w-8" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * DetailSkeleton - Skeleton para páginas de detalhe
 *
 * Combinação de cards laterais e conteúdo principal.
 */
export function DetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6", className)}>
      {/* Coluna principal */}
      <div className="lg:col-span-2 space-y-6">
        <CardSkeleton hasHeader lines={4} />
        <CardSkeleton hasHeader lines={6} />
      </div>

      {/* Coluna lateral */}
      <div className="space-y-6">
        <CardSkeleton lines={3} />
        <CardSkeleton lines={4} />
      </div>
    </div>
  );
}
