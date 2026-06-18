"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { m } from "framer-motion";
import { ClientForm, type ClientFormData } from "@/components/modules/client-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";

const easeOut = [0.23, 1, 0.32, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: easeOut },
  },
};

export default function NovoClienteContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: ClientFormData) {
    setError(null);
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao criar cliente");
      return;
    }

    router.push("/clientes");
    router.refresh();
  }

  return (
    <m.div
      className="max-w-[1400px] mx-auto px-6 py-8 space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <m.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400">
            <UserPlus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-[2.25rem] font-extrabold text-foreground">Novo Cliente</h1>
            <p className="text-base font-medium text-muted-foreground mt-1">Cadastre um novo cliente</p>
          </div>
        </div>
        <Link href="/clientes">
          <Button variant="ghost" className="rounded-lg h-9 hover:bg-muted/50 transition-all duration-150">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
      </m.div>

      {/* Error */}
      {error && (
        <m.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-base font-medium"
        >
          {error}
        </m.div>
      )}

      {/* Form Card */}
      <m.div variants={itemVariants}>
        <div className="rounded-2xl border border-border/60 border-t-2 border-t-blue-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-5 bg-blue-50/40 dark:bg-blue-950/20 border-b border-border/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Dados do Cliente</h2>
              <p className="text-base text-muted-foreground font-medium">Preencha as informações abaixo</p>
            </div>
          </div>
          <div className="p-6">
            <ClientForm onSubmit={handleSubmit} submitLabel="Criar Cliente" />
          </div>
        </div>
      </m.div>
    </m.div>
  );
}
