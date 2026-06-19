"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AppointmentForm,
  type AppointmentFormData,
} from "@/components/modules/appointment-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CalendarPlus } from "lucide-react";

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
        // Silently fail
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
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-5">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg h-9 text-sm font-semibold border-border/80 hover:bg-muted/50 transition-all duration-150"
          onClick={() => router.push("/agendamento")}
        >
          <ChevronLeft className="h-4 w-4 mr-1.5" />
          Voltar
        </Button>
      </div>

      <div
        className="rounded-2xl border border-border/60 border-t-2 border-t-indigo-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden"
      >
        <div className="px-6 py-5 bg-indigo-50/40 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-indigo-100 text-indigo-600">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-foreground">Novo Agendamento</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Agende um atendimento para o cliente</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm">
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
      </div>
    </div>
  );
}
