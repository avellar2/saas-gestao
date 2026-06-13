"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EstoqueForm, type EstoqueFormData } from "@/components/modules/estoque-form";

export default function NovoEstoqueContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: EstoqueFormData) {
    setError(null);
    const res = await fetch("/api/estoque", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao criar produto");
      return;
    }

    router.push("/estoque");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Novo Produto</h1>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      <EstoqueForm onSubmit={handleSubmit} submitLabel="Criar Produto" />
    </div>
  );
}
