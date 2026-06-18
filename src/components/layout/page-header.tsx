"use client";

import { m } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  /** Título principal da página */
  title: string;
  /** Descrição opcional abaixo do título */
  description?: string;
  /** Ícone ao lado do título */
  icon?: LucideIcon;
  /** Ações à direita (botões, etc) */
  actions?: React.ReactNode;
  /** Breadcrumbs para navegação hierárquica */
  breadcrumbs?: BreadcrumbItem[];
  /** Badge opcional ao lado do título */
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "outline" | "destructive";
  };
  /** Classes adicionais */
  className?: string;
}

/**
 * PageHeader - Cabeçalho padronizado de página
 *
 * Componente premium para padronizar headers em todas as telas.
 * Suporta título, descrição, ícone, ações, breadcrumbs e badge.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  breadcrumbs,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className={cn("space-y-4", className)}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((item, index) => (
            <div key={index} className="flex items-center gap-1">
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
              {index < breadcrumbs.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Header principal */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Lado esquerdo: ícone + título + descrição */}
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {badge && (
                <Badge variant={badge.variant ?? "secondary"} className="font-medium">
                  {badge.label}
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Lado direito: ações */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </m.div>
  );
}
