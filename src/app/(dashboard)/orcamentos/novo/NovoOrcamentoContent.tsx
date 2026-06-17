"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { QuoteForm, type QuoteFormData } from "@/components/modules/quote-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface CustomerOption {
  id: string;
  name: string;
}

export default function NovoOrcamentoContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch("/api/clientes?limit=100");
        if (res.ok) {
          const data = await res.json();
          setCustomers(
            (data.customers || []).map((c: { id: string; name: string }) => ({
              id: c.id,
              name: c.name,
            }))
          );
        }
      } catch {
        // silently fail
      }
    }
    loadCustomers();
  }, []);

  async function handleSubmit(data: QuoteFormData) {
    setError(null);
    const res = await fetch("/api/orcamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao criar orcamento");
      return;
    }

    router.push("/orcamentos");
    router.refresh();
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-5">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg h-9 text-sm font-semibold border-border/80 hover:bg-muted/50 transition-all duration-150"
          onClick={() => router.push("/orcamentos")}
        >
          <ChevronLeft className="h-4 w-4 mr-1.5" />
          Voltar
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] }}
        className="rounded-2xl border border-border/60 border-t-2 border-t-blue-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden"
      >
        <div className="px-6 py-5 bg-blue-50/40 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-blue-100 text-blue-600">
              <span className="text-lg font-extrabold">#</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-foreground">Novo Orçamento</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Crie um orçamento para enviar ao cliente
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm">
              {error}
            </div>
          )}

          <QuoteForm
            customers={customers}
            onSubmit={handleSubmit}
            submitLabel="Criar Orcamento"
          />
        </div>
      </motion.div>
    </div>
  );
}
