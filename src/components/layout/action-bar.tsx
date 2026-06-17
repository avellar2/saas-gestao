"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ActionItem {
  key: string;
  label: string;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "destructive" | "ghost";
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  external?: boolean;
  divider?: boolean;
}

interface ActionBarProps {
  /** Ações principais (exibidas em botões visíveis) */
  primaryActions?: ActionItem[];
  /** Ações secundárias (agrupadas no dropdown "Mais") */
  secondaryActions?: ActionItem[];
  /** Se true, inverte: primary fica no dropdown, secondary em botões */
  inverted?: boolean;
  /** Alinhamento */
  align?: "left" | "right";
  /** Classes adicionais */
  className?: string;
}

/**
 * ActionBar - Barra de ações hierárquica
 *
 * Separa ações principais (visíveis) de secundárias (dropdown).
 * Mantém todas as ações disponíveis sem poluir a interface.
 *
 * @example
 * <ActionBar
 *   primaryActions={[
 *     { key: "close", label: "Finalizar OS", variant: "default", onClick: handleClose },
 *     { key: "edit", label: "Editar", variant: "outline", onClick: () => setEditing(true) },
 *   ]}
 *   secondaryActions={[
 *     { key: "pdf", label: "Baixar PDF", icon: FileDown, href: `/api/pdf/os/${id}` },
 *     { key: "portal", label: "Link do Portal", icon: ExternalLink, onClick: copyPortal },
 *     { divider: true },
 *     { key: "delete", label: "Excluir", variant: "destructive", icon: Trash2, onClick: handleDelete },
 *   ]}
 * />
 */
export function ActionBar({
  primaryActions = [],
  secondaryActions = [],
  inverted = false,
  align = "right",
  className,
}: ActionBarProps) {
  const [open, setOpen] = useState(false);

  const visible = inverted ? secondaryActions : primaryActions;
  const hidden = inverted ? primaryActions : secondaryActions;

  const renderButton = (action: ActionItem) => {
    if (action.href) {
      const linkProps = action.external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {};
      return (
        <a key={action.key} href={action.href} {...linkProps}>
          <Button
            variant={action.variant ?? "outline"}
            size="sm"
            disabled={action.disabled}
            className="gap-1.5"
          >
            {action.icon && <action.icon className="w-3.5 h-3.5" />}
            {action.label}
          </Button>
        </a>
      );
    }

    return (
      <Button
        key={action.key}
        variant={action.variant ?? "outline"}
        size="sm"
        disabled={action.disabled}
        onClick={action.onClick}
        className="gap-1.5"
      >
        {action.icon && <action.icon className="w-3.5 h-3.5" />}
        {action.label}
      </Button>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        align === "right" && "justify-end",
        className
      )}
    >
      {visible.filter((a) => !a.divider).map(renderButton)}

      {hidden.filter((a) => !a.divider).length > 0 && (
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border bg-background hover:bg-muted hover:text-foreground h-7 gap-1.5 px-2.5 text-[0.8rem] font-medium whitespace-nowrap transition-all outline-none select-none cursor-pointer"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
            <span className="sr-only">Mais ações</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            {hidden.map((action, index) => {
              if (action.divider) {
                return <DropdownMenuSeparator key={`sep-${index}`} />;
              }

              const Icon = action.icon;

              if (action.href) {
                const href = action.href;
                return (
                  <DropdownMenuItem
                    key={action.key}
                    onClick={() => {
                      if (action.external) {
                        window.open(href, "_blank");
                      } else {
                        window.location.href = href;
                      }
                    }}
                    variant={action.variant === "destructive" ? "destructive" : "default"}
                    disabled={action.disabled}
                    className="flex items-center gap-2"
                  >
                    {Icon && <Icon className="w-4 h-4 shrink-0" />}
                    {action.label}
                  </DropdownMenuItem>
                );
              }

              return (
                <DropdownMenuItem
                  key={action.key}
                  onClick={action.onClick}
                  variant={action.variant === "destructive" ? "destructive" : "default"}
                  disabled={action.disabled}
                  className="flex items-center gap-2"
                >
                  {Icon && <Icon className="w-4 h-4 shrink-0" />}
                  {action.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
