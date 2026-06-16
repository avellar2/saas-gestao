"use client";

import { motion } from "framer-motion";
import { FileSearch, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type ErrorType = "not_found" | "invalid_token";

interface PortalOSErrorProps {
  type: ErrorType;
}

const content: Record<ErrorType, { icon: typeof FileSearch; title: string; description: string }> = {
  not_found: {
    icon: FileSearch,
    title: "Ordem de serviço não encontrada",
    description: "A ordem de serviço que você está procurando não existe ou foi removida.",
  },
  invalid_token: {
    icon: AlertTriangle,
    title: "Link inválido",
    description: "Este link não é válido. Verifique se você copiou o endereço correto.",
  },
};

export function PortalOSError({ type }: PortalOSErrorProps) {
  const { icon: Icon, title, description } = content[type];

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-5">
          <Icon className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
          {title}
        </h1>
        <p className="text-muted-foreground mb-6">{description}</p>
        <div className="flex justify-center gap-3">
          <Link href="/">
            <Button variant="outline" className="rounded-xl">
              Voltar ao início
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}