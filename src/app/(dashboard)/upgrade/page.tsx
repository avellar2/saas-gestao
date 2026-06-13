import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";
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

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const moduleKey = params.module as ModuleKey | undefined;

  if (!moduleKey || !MODULE_KEYS.includes(moduleKey)) {
    redirect("/dashboard");
  }

  const moduleInfo = MODULE_DESCRIPTIONS[moduleKey];

  if (!moduleInfo) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Link>

      <div className="flex items-center gap-4">
        <div className="size-12 rounded-2xl bg-muted border border-border flex items-center justify-center">
          <Lock className="size-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{moduleInfo.name}</h1>
          <p className="text-muted-foreground">{moduleInfo.description}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Badge variant="outline" className="mb-3">
              Módulo Bloqueado
            </Badge>
            <h2 className="text-lg font-semibold">Benefícios deste módulo</h2>
          </div>

          <ul className="space-y-2">
            {moduleInfo.benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <span className="size-1.5 rounded-full bg-muted-foreground shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>

          <div className="pt-4 border-t">
            <p className="text-2xl font-bold">
              A partir de{" "}
              <span className="text-primary">R$50/mês</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Contate o administrador para ativar este módulo.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button>Solicitar Ativação</Button>
        <Link href="/dashboard">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>
    </div>
  );
}