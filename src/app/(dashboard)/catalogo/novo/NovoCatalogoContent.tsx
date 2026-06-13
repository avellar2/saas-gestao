"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CatalogoForm, type CatalogoFormData } from "@/components/modules/catalogo-form";

export default function NovoCatalogoContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: CatalogoFormData) {
    setError(null);
    const res = await fetch("/api/catalogo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao criar item");
      return;
    }

    router.push("/catalogo");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Novo Item no Catalogo</h1>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      <CatalogoForm onSubmit={handleSubmit} submitLabel="Criar Item" />
    </div>
  );
}
