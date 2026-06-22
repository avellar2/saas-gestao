"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowLeft, Check, Loader2, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PURCHASABLE_MODULES, getModuleConfig, type ModuleKey } from "@/lib/modules";
import { BASE_PRICE, calculateMonthlyPrice } from "@/lib/pricing";

interface ActiveModule {
  key: string;
  name: string;
}

interface ConfirmModal {
  open: boolean;
  moduleKey: string;
  moduleName: string;
  modulePrice: number;
  extraModules: { name: string; price: number }[];
  total: number;
}

interface RemoveModal {
  open: boolean;
  moduleKey: string;
  moduleName: string;
  modulePrice: number;
}

export default function UpgradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleKey = searchParams.get("module") as ModuleKey | null;
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [activeModules, setActiveModules] = useState<ActiveModule[]>([]);
  const [hasStripeSubscription, setHasStripeSubscription] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>({
    open: false,
    moduleKey: "",
    moduleName: "",
    modulePrice: 0,
    extraModules: [],
    total: 0,
  });
  const [removeModal, setRemoveModal] = useState<RemoveModal>({
    open: false,
    moduleKey: "",
    moduleName: "",
    modulePrice: 0,
  });

  const moduleInfo = moduleKey ? getModuleConfig(moduleKey) : null;

  // Fetch active modules to show which are already active
  useEffect(() => {
    async function fetchModules() {
      try {
        const res = await fetch("/api/empresas/me/modules");
        if (res.ok) {
          const data = await res.json();
          setActiveModules(data.activeModules || []);
          setHasStripeSubscription(data.hasStripeSubscription || false);
          setIsTrial(data.isTrial || false);
        }
      } catch {
        // Ignore - modules will just show as not active
      }
    }
    fetchModules();
  }, []);

  // Filter purchasable modules that are active (not coming_soon for purchase)
  const purchasableModules = PURCHASABLE_MODULES.filter((m) => m.status === "active");

  function openConfirmModal(selectedModuleKey: string) {
    const config = getModuleConfig(selectedModuleKey);
    if (!config) return;

    // Calculate what will be charged
    const extraModules: { name: string; price: number }[] = [];

    if (isTrial && !hasStripeSubscription) {
      // First purchase: new module is extra, base plan covers the rest
      if (config.monthlyPrice > 0) {
        extraModules.push({ name: config.name, price: config.monthlyPrice });
      }
    } else if (hasStripeSubscription) {
      // Already has subscription: just the new module price
      if (config.monthlyPrice > 0) {
        extraModules.push({ name: config.name, price: config.monthlyPrice });
      }
    }

    const extraTotal = extraModules.reduce((sum, m) => sum + m.price, 0);
    const total = hasStripeSubscription ? extraTotal : BASE_PRICE + extraTotal;

    setConfirmModal({
      open: true,
      moduleKey: selectedModuleKey,
      moduleName: config.name,
      modulePrice: config.monthlyPrice,
      extraModules,
      total,
    });
  }

  async function handleConfirmCheckout() {
    const selectedModuleKey = confirmModal.moduleKey;
    setConfirmModal({ ...confirmModal, open: false });
    setLoading(selectedModuleKey);
    setError("");

    try {
      if (!hasStripeSubscription) {
        // In trial: includedModuleKey = first non-core active module, extraModuleKey = new module
        const firstNonCore = activeModules.find((m) => {
          const cfg = getModuleConfig(m.key);
          return cfg && cfg.type !== "core";
        });
        const firstActive = firstNonCore?.key || selectedModuleKey;
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            includedModuleKey: firstActive,
            extraModuleKey: isTrial ? selectedModuleKey : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Erro ao iniciar pagamento");
          return;
        }

        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const res = await fetch("/api/stripe/modules/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleKey: selectedModuleKey }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Erro ao adicionar modulo");
          return;
        }

        setActiveModules((prev) => [...prev, { key: selectedModuleKey, name: data.moduleKey || selectedModuleKey }]);
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(null);
    }
  }

  function openRemoveModal(moduleKey: string, moduleName: string, modulePrice: number) {
    setRemoveModal({ open: true, moduleKey, moduleName, modulePrice });
  }

  async function handleConfirmRemove() {
    const { moduleKey, moduleName } = removeModal;
    setRemoveModal({ ...removeModal, open: false });
    setLoading(moduleKey);
    setError("");

    try {
      const res = await fetch("/api/stripe/modules/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao remover modulo");
        return;
      }

      setActiveModules((prev) => prev.filter((m) => m.key !== moduleKey));
    } catch {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setLoading(null);
    }
  }

  // Determine if a module is already active
  function isModuleActive(key: string): boolean {
    return activeModules.some((m) => m.key === key);
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
            const isAlreadyActive = isModuleActive(mod.key);

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
                {isAlreadyActive && (
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">
                      Ativo
                    </Badge>
                    {(hasStripeSubscription || isTrial) && mod.key !== "customers" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openRemoveModal(mod.key, mod.name, mod.monthlyPrice);
                        }}
                        disabled={loading !== null}
                        className="w-5 h-5 rounded-full bg-red-100 text-red-600 border border-red-200 flex items-center justify-center hover:bg-red-200 transition-colors text-[10px] font-bold"
                        title="Remover modulo"
                      >
                        ×
                      </button>
                    )}
                  </div>
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
                    disabled={!isActive || loading !== null || isAlreadyActive}
                    onClick={() => isActive && !isAlreadyActive && openConfirmModal(mod.key)}
                  >
                    {isAlreadyActive ? (
                      "Ativo"
                    ) : loading === mod.key ? (
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

      {/* Remove Module Modal */}
      {removeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-2xl bg-card border border-border shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
              <h2 className="text-lg font-bold">Remover Módulo</h2>
              <button
                onClick={() => setRemoveModal({ ...removeModal, open: false })}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja remover <strong>{removeModal.moduleName}</strong>?
              </p>

              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-700 dark:text-amber-400">
                <p className="font-semibold">💡 Crédito proporcional</p>
                <p className="mt-1 opacity-80">
                  O Stripe calcula automaticamente o valor proporcional aos dias restantes do ciclo e
                  <strong> abate como crédito na próxima fatura</strong>. Você só paga pelo tempo que usou.
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">{removeModal.moduleName}</span>
                <span className="text-sm font-medium text-muted-foreground line-through">R$ {removeModal.modulePrice}</span>
              </div>
            </div>

            <div className="px-6 pb-6 pt-4 border-t border-border flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRemoveModal({ ...removeModal, open: false })}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleConfirmRemove}
              >
                Remover
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-2xl bg-card border border-border shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
              <h2 className="text-lg font-bold">Confirmar Assinatura</h2>
              <button
                onClick={() => setConfirmModal({ ...confirmModal, open: false })}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Revise os valores antes de ir para o pagamento:
              </p>

              {!hasStripeSubscription ? (
                <>
                  {/* Base plan (first purchase) */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <span className="text-sm font-medium">Plano Base</span>
                      <p className="text-xs text-muted-foreground">Clientes + 1 módulo incluso</p>
                    </div>
                    <span className="text-sm font-semibold">R$ {BASE_PRICE}</span>
                  </div>

                  {/* Included module */}
                  <div className="flex items-center justify-between py-2 bg-primary/5 rounded-lg px-3">
                    <div className="flex items-center gap-2">
                      <Check className="size-4 text-primary" />
                      <span className="text-sm font-medium">{confirmModal.moduleName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Incluso</span>
                  </div>
                </>
              ) : (
                <>
                  {/* Already has subscription */}
                  <div className="flex items-center justify-between py-2 bg-primary/5 rounded-lg px-3">
                    <div className="flex items-center gap-2">
                      <Check className="size-4 text-primary" />
                      <span className="text-sm font-medium">Assinatura ativa</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Já paga</span>
                  </div>
                </>
              )}

              {/* Extra modules */}
              {confirmModal.extraModules.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {hasStripeSubscription ? "Novo módulo" : "Módulos extras"}
                  </span>
                  {confirmModal.extraModules.map((m, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <span className="text-sm">{m.name}</span>
                      <span className="text-sm font-medium">R$ {m.price}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">Total por mês</span>
                  <span className="text-xl font-bold text-primary">R$ {confirmModal.total}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-4 border-t border-border flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmModal({ ...confirmModal, open: false })}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleConfirmCheckout}
              >
                Ir para Pagamento
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
