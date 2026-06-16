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

interface ProductOption {
  id: string;
  name: string;
  salePrice: number;
  quantity: number;
}

export default function NovaOSContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [inventoryActive, setInventoryActive] = useState(false);

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

      // Check if inventory module is active
      try {
        const invRes = await fetch("/api/estoque?limit=1");
        if (invRes.ok) {
          setInventoryActive(true);
          // Load products for the selector
          const prodRes = await fetch("/api/estoque?limit=500&active=true");
          if (prodRes.ok) {
            const prodData = await prodRes.json();
            setProducts(
              (prodData.products || []).map(
                (p: { id: string; name: string; salePrice: number; quantity: number }) => ({
                  id: p.id,
                  name: p.name,
                  salePrice: p.salePrice,
                  quantity: p.quantity,
                })
              )
            );
          }
        }
      } catch {
        // silently fail — inventory inactive or API unavailable
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
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      <ServiceOrderForm
        customers={customers}
        quotes={quotes}
        products={products}
        inventoryActive={inventoryActive}
        onSubmit={handleSubmit}
        submitLabel="Criar OS"
      />
    </div>
  );
}