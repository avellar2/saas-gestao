"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface TabConfig {
  /** URL do link */
  href: string;
  /** Label exibido */
  label: string;
  /** Ícone opcional */
  icon?: LucideIcon;
  /** Se true, requer match exato do pathname */
  exact?: boolean;
  /** Se true, desabilita o tab */
  disabled?: boolean;
}

interface SectionTabsProps {
  /** Array de configurações de tabs */
  tabs: TabConfig[];
  /** Classe adicional */
  className?: string;
  /** Classe para o container de tabs */
  tabsContainerClassName?: string;
}

/**
 * SectionTabs - Abas padronizadas para seções
 *
 * Usado em:
 * - Financeiro
 * - Estoque
 * - Relatórios
 * - Cardápio
 *
 * @example
 * <SectionTabs
 *   tabs={[
 *     { href: "/financeiro", label: "Visão Geral", icon: BarChart3, exact: true },
 *     { href: "/financeiro/receber", label: "Contas a Receber", icon: ArrowUpFromLine },
 *   ]}
 * />
 */
export function SectionTabs({
  tabs,
  className,
  tabsContainerClassName,
}: SectionTabsProps) {
  const pathname = usePathname();

  const isActive = (tab: TabConfig): boolean => {
    if (tab.disabled) return false;
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Tabs container */}
      <div
        className={cn(
          "relative flex flex-wrap gap-1 border-b border-border/60 pb-0",
          tabsContainerClassName
        )}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);

          return (
            <Link
              key={tab.href}
              href={tab.disabled ? "#" : tab.href}
              className={cn(
                "group relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium",
                "transition-colors duration-160 ease-out",
                "rounded-t-lg",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                tab.disabled && "opacity-50 cursor-not-allowed pointer-events-none"
              )}
            >
              {/* Background hover/active */}
              {active && (
                <div
                  className="absolute inset-0 bg-primary/10 rounded-t-lg"
                />
              )}

              {/* Indicator line */}
              {active && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                />
              )}

              {/* Content */}
              <span className="relative z-10 flex items-center gap-1.5">
                {Icon && (
                  <Icon
                    className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      active && "group-hover:scale-110"
                    )}
                  />
                )}
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/**
 * SectionTabsVertical - Versão vertical das abas
 *
 * Para sidebars ou navegação lateral.
 */
interface SectionTabsVerticalProps {
  tabs: TabConfig[];
  className?: string;
}

export function SectionTabsVertical({
  tabs,
  className,
}: SectionTabsVerticalProps) {
  const pathname = usePathname();

  const isActive = (tab: TabConfig): boolean => {
    if (tab.disabled) return false;
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  };

  return (
    <nav className={cn("space-y-1", className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab);

        return (
          <Link
            key={tab.href}
            href={tab.disabled ? "#" : tab.href}
            className={cn(
              "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl",
              "transition-colors duration-160",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              tab.disabled && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  active && "group-hover:scale-110 transition-transform"
                )}
              />
            )}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
