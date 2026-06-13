"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FinanceiroForm,
  type FinanceiroFormData,
} from "@/components/modules/financeiro-form";

interface CustomerOption {
  id: string;
  name: string;
}

export default function NovoFinanceiroContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch("/api/clientes?limit=1000");
        if (res.ok) {
          const data = await res.json();
          setCustomers(data.customers || []);
        }
      } catch {
        // Silently fail - customers are optional
      }
    }
    loadCustomers();
  }, []);

  async function handleSubmit(data: FinanceiroFormData) {
    setError(null);
    const res = await fetch("/api/financeiro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        amount: parseFloat(data.amount),
        dueDate: data.dueDate || null,
        customerId: data.customerId || null,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao criar transacao");
      return;
    }

    router.push("/financeiro");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nova Transacao Financeira</h1>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      <FinanceiroForm
        onSubmit={handleSubmit}
        submitLabel="Criar Transacao"
        customers={customers}
      />
    </div>
  );
}
