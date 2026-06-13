"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CardapioForm,
  type MenuItemFormData,
} from "@/components/modules/cardapio-form";

export default function NovoCardapioContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: MenuItemFormData) {
    setError(null);

    const payload = {
      ...data,
      price: data.price === "" ? 0 : data.price,
    };

    const res = await fetch("/api/cardapio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao criar item");
      return;
    }

    router.push("/cardapio");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Novo Item no Cardapio</h1>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      <CardapioForm onSubmit={handleSubmit} submitLabel="Criar Item" />
    </div>
  );
}
