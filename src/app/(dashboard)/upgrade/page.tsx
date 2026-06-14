"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MODULE_KEYS } from "@/types";
import type { ModuleKey } from "@/types";

const MODULE_DESCRIPTIONS: Record<
  string,
  { name: string; description: string; benefits: string[] }
> = {
  customers: {
    name: "Clientes",
    description: "Gerencie sua base de clientes",
    benefits: [
      "Cadastro completo de clientes",
      "Busca por nome e telefone",
      "Histórico de orçamentos e OS",
    ],
  },
  quotes: {
    name: "Orçamentos",
    description: "Crie e envie orçamentos profissionais",
    benefits: [
      "Itens com cálculo automático",
      "Geração de PDF",
      "Envio pelo WhatsApp",
      "Conversão em OS",
    ],
  },
  service_orders: {
    name: "Ordem de Serviço",
    description: "Controle suas ordens de serviço",
    benefits: [
      "Status de acompanhamento",
      "Controle de pagamento",
      "Geração de PDF",
      "Envio pelo WhatsApp",
    ],
  },
  inventory: {
    name: "Estoque",
    description: "Controle de estoque e produtos",
    benefits: [
      "Cadastro de produtos",
      "Entrada e saída",
      "Alerta de estoque baixo",
    ],
  },
  scheduling: {
    name: "Agendamento",
    description: "Agenda de compromissos",
    benefits: [
      "Calendário visual",
      "Lembretes",
      "Agendamento recorrente",
    ],
  },
  catalog: {
    name: "Catálogo WhatsApp",
    description: "Catálogo de produtos no WhatsApp",
    benefits: [
      "Catálogo digital",
      "Integração WhatsApp Business",
      "Compartilhamento fácil",
    ],
  },
  menu: {
    name: "Cardápio Digital",
    description: "Cardápio digital para restaurantes",
    benefits: [
      "Cardápio online",
      "QR Code",
      "Atualização em tempo real",
    ],
  },
  finance: {
    name: "Financeiro",
    description: "Controle financeiro simples",
    benefits: [
      "Contas a receber",
      "Contas a pagar",
      "Fluxo de caixa",
    ],
  },
  reports: {
    name: "Relatórios",
    description: "Relatórios gerenciais",
    benefits: [
      "Relatório de vendas",
      "Relatório de clientes",
      "Dashboards analíticos",
    ],
  },
  users_permissions: {
    name: "Usuários e Permissões",
    description: "Gerencie acessos ao sistema",
    benefits: [
      "Múltiplos usuários",
      "Permissões por função",
      "Auditoria de ações",
    ],
  },
};

const PLANS = [
  {
    key: "basic",
    name: "Básico",
    price: "R$ 49",
    period: "/mês",
    description: "Para começar",
    modules: 3,
    features: [
      "Até 3 módulos",
      "Até 50 clientes",
      "Suporte por email",
    ],
  },
  {
    key: "pro",
    name: "Profissional",
    price: "R$ 99",
    period: "/mês",
    description: "Para negócios completos",
    modules: 10,
    popular: true,
    features: [
      "Todos os módulos",
      "Clientes ilimitados",
      "Suporte prioritário",
      "Upload de imagens",
    ],
  },
];

export default function UpgradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleKey = searchParams.get("module") as ModuleKey | undefined;
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const moduleInfo = moduleKey && MODULE_KEYS.includes(moduleKey)
    ? MODULE_DESCRIPTIONS[moduleKey]
    : null;

  async function handleCheckout(plan: string) {
    setLoading(plan);
    setError("");

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, moduleKey: moduleKey || "" }),
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
            Escolha o plano ideal para seu negócio
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {PLANS.map((plan) => (
          <Card
            key={plan.key}
            className={`relative ${
              plan.popular
                ? "border-primary/50 shadow-lg shadow-primary/10"
                : ""
            }`}
          >
            {plan.popular && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                Mais popular
              </Badge>
            )}
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <div>
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleCheckout(plan.key)}
                disabled={loading !== null}
              >
                {loading === plan.key ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Redirecionando...
                  </span>
                ) : (
                  `Assinar ${plan.name}`
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
