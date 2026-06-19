"use client";

import Link from "next/link";
import {
  Building2,
  Users,
  FileText,
  ClipboardList,
  Package,
  Calendar,
  ShoppingBag,
  UtensilsCrossed,
  BarChart3,
  PieChart,
  Shield,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";


const features = [
  {
    icon: Users,
    title: "Clientes",
    description: "Cadastre e organize sua base de clientes com historico completo de interações.",
  },
  {
    icon: FileText,
    title: "Orcamentos",
    description: "Crie orçamentos profissionais e converta em ordens de serviço com um clique.",
  },
  {
    icon: ClipboardList,
    title: "Ordens de Serviço",
    description: "Acompanhe todo o fluxo de trabalho, do inicio ao pagamento final.",
  },
  {
    icon: Package,
    title: "Estoque",
    description: "Controle de produtos, movimentações e alertas de estoque baixo.",
  },
  {
    icon: Calendar,
    title: "Agendamento",
    description: "Gerencie compromissos e organize a agenda da sua equipe.",
  },
  {
    icon: ShoppingBag,
    title: "Catalogo WhatsApp",
    description: "Mostre seus produtos diretamente no WhatsApp de forma organizada.",
  },
  {
    icon: UtensilsCrossed,
    title: "Cardapio Digital",
    description: "Cardapio online para restaurantes, lanchonetes e bares.",
  },
  {
    icon: BarChart3,
    title: "Financeiro",
    description: "Controle de receitas, despesas e fluxo de caixa simplificado.",
  },
  {
    icon: PieChart,
    title: "Relatorios",
    description: "Dashboards e metricas para tomar decisoes baseadas em dados.",
  },
  {
    icon: Shield,
    title: "Usuarios e Permissoes",
    description: "Controle quem acessa o que com niveis de permissao personalizados.",
  },
];

const benefits = [
  "Multiempresa com isolamento total de dados",
  "Relatorios em tempo real",
  "Exportacao para CSV",
  "Logs de atividades auditaveis",
  "Controle de modulos por empresa",
  "Suporte a trial e planos pagos",
];

export default function LandingPageClient() {
  return (
    <div className="min-h-[100dvh] bg-background grain">
      {/* Hero - Asymmetric split */}
      <section className="relative min-h-[100dvh] flex items-center overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />

        <div
          className="absolute top-20 right-20 w-[400px] h-[400px] rounded-full bg-primary/8 blur-[100px]"
        />
        <div
          className="absolute bottom-20 left-10 w-[500px] h-[500px] rounded-full bg-primary/6 blur-[120px]"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            <div
              className="max-w-xl"
            >
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Sistema completo para pequenas empresas
                </div>
              </div>

              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.1] text-foreground"
              >
                Gestao simplificada para{" "}
                <span className="text-primary">pequenas empresas</span>
              </h1>

              <p
                className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-[60ch]"
              >
                Clientes, orçamentos, ordens de serviço, estoque, financeiro e muito mais. Tudo em um so lugar, com controle multiempresa.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login">
                  <div>
                    <Button
                      size="lg"
                      className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 px-6 h-12 text-base"
                    >
                      Acessar sistema
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </Link>
                <Link href="#recursos">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-xl border-border/60 h-12 px-6 text-base font-medium"
                  >
                    Ver recursos
                  </Button>
                </Link>
              </div>

              <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>10 modulos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Multiempresa</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Relatorios CSV</span>
                </div>
              </div>
            </div>


            <div
              className="hidden lg:block"
            >
              <div className="relative">
                <div className="grid grid-cols-2 gap-3">
                  {features.slice(0, 4).map((feature, i) => (
                    <div
                      key={feature.title}
                      className="rounded-2xl bg-card/80 border border-border/50 p-5 backdrop-blur-sm shadow-sm"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                        <feature.icon className="w-4 h-4" />
                      </div>
                      <p className="font-semibold text-sm text-foreground">{feature.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{feature.description.slice(0, 45)}...</p>
                    </div>
                  ))}
                </div>


                <div
                  className="absolute -top-4 -right-4 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg"
                >
                  10 modulos
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Zig Zag */}
      <section id="recursos" className="py-24 lg:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
                                  className="text-left mb-16"
          >
            <p className="text-primary font-semibold text-sm mb-3">Recursos</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Tudo que voce precisa{" "}
              <span className="text-muted-foreground">em uma plataforma</span>
            </h2>
          </div>

          <div className="space-y-20">
            {features.slice(0, 6).map((feature, i) => (
              <div
                key={feature.title}
                                              className={`grid lg:grid-cols-2 gap-10 items-center ${
                  i % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
                <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                  <div className="rounded-[2rem] bg-muted/50 border border-border/40 p-8 aspect-[4/3] flex items-center justify-center">
                    <feature.icon className="w-16 h-16 text-muted-foreground/20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits grid */}
      <section className="py-24 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
                                  className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Por que escolher o Gestor Local?</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((benefit, i) => (
              <div
                key={benefit}
                                              className="rounded-2xl bg-card border border-border/50 p-5 flex items-start gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-foreground">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-50" />
        <div
                            className="relative max-w-3xl mx-auto px-4 text-center"
        >
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">
            Pronto para organizar sua empresa?</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Comece agora e tenha acesso a todos os modulos. Sem complicação.
          </p>
          <Link href="/login">
            <div>
              <Button
                size="lg"
                className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 px-8 h-12 text-base"
              >
                Acessar o sistema
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm text-foreground">Gestor Local</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Gestor Local. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
