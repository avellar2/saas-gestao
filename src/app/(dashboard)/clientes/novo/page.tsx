"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientForm, type ClientFormData } from "@/components/modules/client-form";

export default function NovoClientePage() {
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Novo Cliente</h1>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      <ClientForm onSubmit={handleSubmit} submitLabel="Criar Cliente" />
    </div>
  );
}