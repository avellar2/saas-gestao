"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowLeft, Check, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PURCHASABLE_MODULES, getModuleConfig, type ModuleKey } from "@/lib/modules";
import { BASE_PRICE, calculateMonthlyPrice } from "@/lib/pricing";

export default function UpgradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleKey = searchParams.get("module") as ModuleKey | null;
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const moduleInfo = moduleKey ? getModuleConfig(moduleKey) : null;

  // Filter purchasable modules that are active (not coming_soon for purchase)
  const purchasableModules = PURCHASABLE_MODULES.filter((m) => m.status === "active");

  async function handleCheckout(selectedModuleKey: string) {
    setLoading(selectedModuleKey);
    setError("");

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Legacy flow: send plan + moduleKey for backward compatibility
        body: JSON.stringify({ plan: "basic", moduleKey: selectedModuleKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao iniciar pagamento");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Link>

      {moduleInfo && (
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-muted border border-border flex items-center justify-center">
            <Lock className="size-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{moduleInfo.name}</h1>
            <p className="text-muted-foreground">{moduleInfo.description}</p>
          </div>
        </div>
      )}

      {!moduleInfo && (
        <div>
          <h1 className="text-2xl font-bold">Upgrade do Plano</h1>
          <p className="text-muted-foreground">
            Escolha os módulos ideais para seu negócio
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Base plan info */}
      <div className="rounded-2xl bg-primary/5 border border-primary/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Plano Base</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Clientes (incluso) + 1 módulo à escolha
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold">R$ {BASE_PRICE}</span>
            <span className="text-muted-foreground">/mês</span>
          </div>
        </div>
      </div>

      {/* Available modules */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Módulos Disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PURCHASABLE_MODULES.map((mod) => {
            const isActive = mod.status === "active";
            const isComingSoon = mod.status === "coming_soon";

            return (
              <Card
                key={mod.key}
                className={`relative ${
                  mod.key === moduleKey ? "border-primary/50 shadow-lg shadow-primary/10" : ""
                } ${!isActive ? "opacity-70" : ""}`}
              >
                {isComingSoon && (
                  <Badge className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-[10px]">
                    Em breve
                  </Badge>
                )}
                <CardContent className="p-5 space-y-4">
                  <div>
                    <h3 className="text-base font-semibold">{mod.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>
                  </div>

                  <div>
                    {mod.monthlyPrice > 0 ? (
                      <span className="text-xl font-bold">R$ {mod.monthlyPrice}</span>
                    ) : (
                      <span className="text-xl font-bold text-muted-foreground">Incluso</span>
                    )}
                    {mod.monthlyPrice > 0 && (
                      <span className="text-muted-foreground">/mês</span>
                    )}
                  </div>

                  <ul className="space-y-1.5">
                    {mod.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="size-3.5 text-primary shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={mod.key === moduleKey ? "default" : "outline"}
                    disabled={!isActive || loading !== null}
                    onClick={() => isActive && handleCheckout(mod.key)}
                  >
                    {loading === mod.key ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Redirecionando...
                      </span>
                    ) : !isActive ? (
                      <span className="flex items-center gap-2">
                        <Clock className="size-4" />
                        Em breve
                      </span>
                    ) : (
                      `Assinar ${mod.name}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}