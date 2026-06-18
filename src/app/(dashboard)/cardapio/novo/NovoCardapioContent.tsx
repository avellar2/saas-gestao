"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { m } from "framer-motion";
import {
  CardapioForm,
  type MenuItemFormData,
} from "@/components/modules/cardapio-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChefHat } from "lucide-react";

const easeOut = [0.23, 1, 0.32, 1] as [number, number, number, number];

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
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-5">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg h-9 text-sm font-semibold border-border/80 hover:bg-muted/50 transition-all duration-150"
          onClick={() => router.push("/cardapio")}
        >
          <ChevronLeft className="h-4 w-4 mr-1.5" />
          Voltar
        </Button>
      </div>

      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: easeOut }}
        className="rounded-2xl border border-border/60 border-t-2 border-t-orange-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden"
      >
        <div className="px-6 py-5 bg-orange-50/40 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-orange-100 text-orange-600">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-foreground">Novo Item no Cardápio</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Adicione um novo prato ou bebida</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive p-3 text-sm">
              {error}
            </div>
          )}

          <CardapioForm onSubmit={handleSubmit} submitLabel="Criar Item" />
        </div>
      </m.div>
    </div>
  );
}
