"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { SkeletonShimmer } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  /** Label do card */
  label: string;
  /** Valor numérico */
  value: number;
  /** Ícone do card */
  icon: LucideIcon;
  /** Descrição opcional abaixo do valor */
  description?: string;
  /** Indicador de tendência (ex: "+12%", "-5%") */
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  /** Cor/tone do card */
  tone?: "default" | "success" | "warning" | "danger" | "info";
  /** Estado de loading */
  loading?: boolean;
  /** Prefixo (ex: "R$", "+") */
  prefix?: string;
  /** Sufixo (ex: "%", "kg") */
  suffix?: string;
  /** Atraso na animação (em segundos) */
  delay?: number;
  /** Classes adicionais */
  className?: string;
}

const toneMap = {
  default: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

const trendColorMap = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-red-600 dark:text-red-400",
  neutral: "text-muted-foreground",
};

/**
 * StatCard - Card de métricas premium
 *
 * Baseado no MetricCard do dashboard, mas padronizado e reutilizável.
 * Suporta loading, tendências, prefixos/sufixos e animações.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  description,
  trend,
  tone = "default",
  loading = false,
  prefix,
  suffix,
  delay = 0,
  className,
}: StatCardProps) {
  const toneClasses = toneMap[tone];

  if (loading) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border/60 bg-card p-5 shadow-soft",
          className
        )}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <SkeletonShimmer className="h-4 w-24" />
            <SkeletonShimmer className="h-8 w-20" />
          </div>
          <SkeletonShimmer className="h-10 w-10 rounded-xl" />
        </div>
        <SkeletonShimmer className="h-3 w-32 mt-3" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay,
        ease: [0.23, 1, 0.32, 1],
      }}
      className={cn(
        "group rounded-2xl border border-border/60 bg-card p-5 shadow-soft",
        "transition-shadow duration-300 hover:shadow-lift",
        className
      )}
    >
      <div className="flex items-start justify-between">
        {/* Conteúdo */}
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">
            {label}
          </p>
          <div className="flex items-baseline gap-1">
            {prefix && (
              <span className="text-lg font-semibold text-muted-foreground">
                {prefix}
              </span>
            )}
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
              <AnimatedCounter value={value} />
            </span>
            {suffix && (
              <span className="text-lg font-semibold text-muted-foreground">
                {suffix}
              </span>
            )}
          </div>
        </div>

        {/* Ícone */}
        <div
          className={cn(
            "p-2.5 rounded-xl shrink-0 transition-transform duration-200",
            "group-hover:scale-110 group-active:scale-[0.97]",
            toneClasses
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Footer: descrição ou trend */}
      {(description || trend) && (
        <div className="mt-3 flex items-center gap-2">
          {trend && (
            <span className={cn("text-xs font-semibold", trendColorMap[trend.direction])}>
              {trend.value}
            </span>
          )}
          <span className="text-xs text-muted-foreground truncate">
            {trend?.label ?? description}
          </span>
        </div>
      )}
    </motion.div>
  );
}
