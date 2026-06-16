"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface SectionCardProps {
  /** Título da seção */
  title: string;
  /** Descrição opcional */
  description?: string;
  /** Ícone ao lado do título */
  icon?: LucideIcon;
  /** Ações no header (botões, links, etc) */
  actions?: React.ReactNode;
  /** Conteúdo */
  children: React.ReactNode;
  /** Footer opcional */
  footer?: React.ReactNode;
  /** Se true, remove padding do conteúdo (útil para tabelas) */
  noPadding?: boolean;
  /** Variante visual */
  variant?: "default" | "subtle" | "elevated";
  /** Classes adicionais */
  className?: string;
  /** Classes adicionais para o header */
  headerClassName?: string;
}

/**
 * SectionCard - Card de seção padronizado
 *
 * Usado para agrupar informações em blocos visuais consistentes.
 * Ideal para:
 * - Detalhes de OS
 * - Seções do financeiro
 * - Cards de estoque
 * - Relatórios
 */
export function SectionCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  footer,
  noPadding = false,
  variant = "default",
  className,
  headerClassName,
}: SectionCardProps) {
  const variantClasses = {
    default: "bg-card border border-border/60 shadow-soft",
    subtle: "bg-muted/30 border border-border/40",
    elevated: "bg-card border border-border/60 shadow-lift",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "rounded-2xl overflow-hidden",
        variantClasses[variant],
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-start justify-between gap-4",
          "px-5 py-4 border-b border-border/50",
          headerClassName
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl bg-muted shrink-0">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground truncate">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn(!noPadding && "p-5")}>{children}</div>

      {/* Footer */}
      {footer && (
        <div className="px-5 py-3 border-t border-border/50 bg-muted/20">
          {footer}
        </div>
      )}
    </motion.div>
  );
}

/**
 * SectionCardSimple - Versão simplificada sem header estruturado
 *
 * Para casos onde o conteúdo é simples e não precisa de título/actions.
 */
interface SectionCardSimpleProps {
  children: React.ReactNode;
  variant?: "default" | "subtle" | "elevated";
  className?: string;
}

export function SectionCardSimple({
  children,
  variant = "default",
  className,
}: SectionCardSimpleProps) {
  const variantClasses = {
    default: "bg-card border border-border/60 shadow-soft",
    subtle: "bg-muted/30 border border-border/40",
    elevated: "bg-card border border-border/60 shadow-lift",
  };

  return (
    <div
      className={cn(
        "rounded-2xl p-5",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
