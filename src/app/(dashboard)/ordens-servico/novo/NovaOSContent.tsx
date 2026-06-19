"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ServiceOrderForm,
  type ServiceOrderFormData,
} from "@/components/modules/service-order-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Wrench } from "lucide-react";

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

      try {
        const invRes = await fetch("/api/estoque?limit=1");
        if (invRes.ok) {
          setInventoryActive(true);
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
      setError(body.error || "Erro ao criar ordem de serviço");
      return;
    }

    router.push("/ordens-servico");
    router.refresh();
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-5">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg h-9 text-sm font-semibold border-border/80 hover:bg-muted/50 transition-all duration-150"
          onClick={() => router.push("/ordens-servico")}
        >
          <ChevronLeft className="h-4 w-4 mr-1.5" />
          Voltar
        </Button>
      </div>

      <div
        className="rounded-2xl border border-border/60 border-t-2 border-t-blue-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden"
      >
        <div className="px-6 py-5 bg-blue-50/40 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-blue-100 text-blue-600">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-foreground">Nova Ordem de Serviço</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Crie uma ordem de serviço para o cliente</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm">
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
      </div>
    </div>
  );
}
