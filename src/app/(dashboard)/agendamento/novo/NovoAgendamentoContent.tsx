"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AppointmentForm,
  type AppointmentFormData,
} from "@/components/modules/appointment-form";

interface CustomerOption {
  id: string;
  name: string;
}

export default function NovoAgendamentoContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch("/api/clientes?limit=1000");
        if (res.ok) {
          const data = await res.json();
          setCustomers(
            (data.customers || []).map(
              (c: { id: string; name: string }) => ({
                id: c.id,
                name: c.name,
              })
            )
          );
        }
      } catch {
        // Silently fail - empty customer list
      } finally {
        setLoadingCustomers(false);
      }
    }
    loadCustomers();
  }, []);

  async function handleSubmit(data: AppointmentFormData) {
    setError(null);
    const res = await fetch("/api/agendamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao criar agendamento");
      return;
    }

    router.push("/agendamento");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Novo Agendamento</h1>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      {loadingCustomers ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando...
        </div>
      ) : (
        <AppointmentForm
          customers={customers}
          onSubmit={handleSubmit}
          submitLabel="Criar Agendamento"
        />
      )}
    </div>
  );
}
