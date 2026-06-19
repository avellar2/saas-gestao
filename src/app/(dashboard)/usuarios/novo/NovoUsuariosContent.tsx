"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UsuarioForm, type UsuarioFormData } from "@/components/modules/usuario-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft, UserPlus } from "lucide-react";

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
      setError(body.error || "Erro ao criar usuário");
      return;
    }

    router.push("/usuarios");
    router.refresh();
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-5">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg h-9 text-sm font-semibold border-border/80 hover:bg-muted/50 transition-all duration-150"
          onClick={() => router.push("/usuarios")}
        >
          <ChevronLeft className="h-4 w-4 mr-1.5" />
          Voltar
        </Button>
      </div>

      <div
        className="rounded-2xl border border-border/60 border-t-2 border-t-slate-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden"
      >
        <div className="px-6 py-5 bg-slate-50/40 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-slate-100 text-slate-600">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-foreground">Novo Usuário</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Cadastre um novo colaborador</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm">
              {error}
            </div>
          )}

          <UsuarioForm onSubmit={handleSubmit} submitLabel="Criar Usuário" />
        </div>
      </div>
    </div>
  );
}
