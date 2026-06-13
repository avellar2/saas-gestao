"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QuoteForm, type QuoteFormData } from "@/components/modules/quote-form";

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Novo Orcamento</h1>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      <QuoteForm
        customers={customers}
        onSubmit={handleSubmit}
        submitLabel="Criar Orcamento"
      />
    </div>
  );
}