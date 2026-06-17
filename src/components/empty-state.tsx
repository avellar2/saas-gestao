"use client";

import { motion } from "framer-motion";
import {
  PackageOpen,
  Users,
  UtensilsCrossed,
  Calendar,
  ShoppingBag,
  History,
  FileText,
  ClipboardList,
  Package,
  ArrowLeftRight,
  DollarSign,
  TrendingUp,
  Wrench,
  LayoutDashboard,
  ArrowUpFromLine,
  ArrowDownFromLine,
  AlertTriangle,
  TrendingDown,
  BarChart3,
  CheckCircle,
  XCircle,
  PieChart,
  Clock,
  Receipt,
  Ban,
  Pencil,
  SlidersHorizontal,
  Search,
  X,
  Plus,
  Minus,
  FileDown,
  ExternalLink,
  Copy,
  MessageCircle,
  Phone,
  Mail,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Building2,
  Lock,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  FileSearch,
  Info,
  HelpCircle,
  Store,
  Smartphone,
  CreditCard,
  Banknote,
  QrCode,
  ChefHat,
  Globe,
  Settings,
  Save,
  PackageCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  PackageOpen,
  Users,
  UtensilsCrossed,
  Calendar,
  ShoppingBag,
  History,
  FileText,
  ClipboardList,
  Package,
  ArrowLeftRight,
  DollarSign,
  TrendingUp,
  Wrench,
  LayoutDashboard,
  ArrowUpFromLine,
  ArrowDownFromLine,
  AlertTriangle,
  TrendingDown,
  BarChart3,
  CheckCircle,
  XCircle,
  PieChart,
  Clock,
  Receipt,
  Ban,
  Pencil,
  SlidersHorizontal,
  Search,
  X,
  Plus,
  Minus,
  FileDown,
  ExternalLink,
  Copy,
  MessageCircle,
  Phone,
  Mail,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Building2,
  Lock,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  FileSearch,
  Info,
  HelpCircle,
  Store,
  Smartphone,
  CreditCard,
  Banknote,
  QrCode,
  ChefHat,
  Globe,
  Settings,
  Save,
  PackageCheck,
};

function resolveIcon(icon: string | LucideIcon | undefined): LucideIcon | undefined {
  if (!icon) return undefined;
  if (typeof icon === "string") {
    return ICON_MAP[icon];
  }
  return icon;
}

interface EmptyStateProps {
  /** Título do estado vazio */
  title?: string;
  /** Descrição explicativa */
  description?: string;
  /** Label da ação primária */
  actionLabel?: string;
  /** URL da ação primária (se onAction não for fornecido) */
  actionHref?: string;
  /** Callback da ação primária */
  onAction?: () => void;
  /** Ícone principal (nome do ícone Lucide ou componente) */
  icon?: string | LucideIcon;
  /** Variante visual */
  variant?: "default" | "compact" | "inline";
  /** Label da ação secundária */
  secondaryActionLabel?: string;
  /** Callback da ação secundária */
  onSecondaryAction?: () => void;
  /** URL da ação secundária */
  secondaryActionHref?: string;
  /** Classes adicionais */
  className?: string;
}

/**
 * EmptyState - Estado vazio refinado
 *
 * Visual premium para quando não há dados.
 * Suporta ações primária e secundária, múltiplas variantes.
 *
 * @example
 * <EmptyState
 *   title="Nenhum cliente"
 *   description="Adicione seu primeiro cliente para começar."
 *   actionLabel="Adicionar cliente"
 *   onAction={handleAdd}
 * />
 */
export function EmptyState({
  title = "Nada por aqui",
  description = "Comece adicionando seu primeiro item.",
  actionLabel,
  actionHref,
  onAction,
  icon: iconProp = "PackageOpen",
  variant = "default",
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionHref,
  className,
}: EmptyStateProps) {
  const Icon = resolveIcon(iconProp) ?? PackageOpen;
  const hasPrimaryAction = actionLabel && (actionHref || onAction);
  const hasSecondaryAction =
    secondaryActionLabel &&
    (secondaryActionHref || onSecondaryAction);

  // Variantes
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-3 py-4", className)}>
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <Icon className="w-5 h-5 text-muted-foreground/60" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-foreground">{title}</h4>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {hasPrimaryAction && (
          actionHref ? (
            <a href={actionHref}>
              <Button variant="ghost" size="sm" className="shrink-0">
                {actionLabel}
              </Button>
            </a>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className={cn(
          "flex flex-col items-center justify-center py-10 px-4 text-center",
          className
        )}
      >
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
          <Icon className="w-6 h-6 text-muted-foreground/50" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground max-w-xs mb-4">
            {description}
          </p>
        )}
        {hasPrimaryAction && (
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button variant="outline" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Default variant (full)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className
      )}
    >
      {/* Icon Tile */}
      <div className="relative">
        <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-muted ring-1 ring-border flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-muted-foreground/50" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-foreground mb-1">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-5">
          {description}
        </p>
      )}

      {/* Actions */}
      {(hasPrimaryAction || hasSecondaryAction) && (
        <div className="flex items-center gap-2">
          {hasSecondaryAction && (
            secondaryActionHref ? (
              <a href={secondaryActionHref}>
                <Button variant="ghost" size="sm">
                  {secondaryActionLabel}
                </Button>
              </a>
            ) : (
              <Button variant="ghost" size="sm" onClick={onSecondaryAction}>
                {secondaryActionLabel}
              </Button>
            )
          )}
          {hasPrimaryAction && (
            <motion.div whileTap={{ scale: 0.97 }}>
              {actionHref ? (
                <a href={actionHref}>
                  <Button variant="outline" className="rounded-xl">
                    {actionLabel}
                  </Button>
                </a>
              ) : (
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={onAction}
                >
                  {actionLabel}
                </Button>
              )}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
