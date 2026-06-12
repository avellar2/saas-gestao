"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ServiceOrderForm,
  type ServiceOrderFormData,
} from "@/components/modules/service-order-form";

interface CustomerOption {
  id: string;
  name: string;
}

interface QuoteOption {
  id: string;
  number: number;
  customerName: string;
}

export default function NovaOSPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const custRes = await fetch("/api/clientes?limit=100");
        if (custRes.ok) {
          const data = await custRes.json();
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

      try {
        const quoteRes = await fetch("/api/orcamentos?status=APPROVED");
        if (quoteRes.ok) {
          const data = await quoteRes.json();
          setQuotes(
            (Array.isArray(data) ? data : []).map(
              (q: { id: string; number: number; customer: { name: string } }) => ({
                id: q.id,
                number: q.number,
                customerName: q.customer.name,
              })
            )
          );
        }
      } catch {
        // silently fail
      }
    }
    loadData();
  }, []);

  async function handleSubmit(data: ServiceOrderFormData) {
    setError(null);
    const res = await fetch("/api/ordens-servico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao criar ordem de servico");
      return;
    }

    router.push("/ordens-servico");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nova Ordem de Servico</h1>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      <ServiceOrderForm
        customers={customers}
        quotes={quotes}
        onSubmit={handleSubmit}
        submitLabel="Criar OS"
      />
    </div>
  );
}