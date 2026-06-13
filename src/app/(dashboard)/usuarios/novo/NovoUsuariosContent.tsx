"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UsuarioForm, type UsuarioFormData } from "@/components/modules/usuario-form";

export default function NovoUsuariosContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: UsuarioFormData) {
    setError(null);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Erro ao criar usuario");
      return;
    }

    router.push("/usuarios");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Novo Usuario</h1>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      <UsuarioForm onSubmit={handleSubmit} submitLabel="Criar Usuario" />
    </div>
  );
}
