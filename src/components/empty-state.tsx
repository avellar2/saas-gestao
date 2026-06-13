"use client";

import { motion } from "framer-motion";
import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: React.ElementType;
}

export function EmptyState({
  title = "Nada por aqui",
  description = "Comece adicionando seu primeiro item.",
  actionLabel,
  actionHref,
  onAction,
  icon: Icon = PackageOpen,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-5">{description}</p>
      {(actionLabel && (actionHref || onAction)) && (
        <motion.div whileTap={{ scale: 0.97 }}>
          {actionHref ? (
            <a href={actionHref}>
              <Button variant="outline" className="rounded-xl">{actionLabel}</Button>
            </a>
          ) : (
            <Button variant="outline" className="rounded-xl" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
