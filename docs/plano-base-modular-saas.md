# Plano de Implementação — Base Modular SaaS AVGESTÃO

**Data:** 2026-06-15 (v2 — com correções)
**Etapa:** 1 (preparar base modular)
**Abordagem:** Configuração Central Pura (Abordagem A)

---

## Objetivo

Criar `src/lib/modules.ts` como única fonte de verdade para módulos, e atualizar todos os consumidores para lerem dessa config central. Eliminar toda duplicação.

---

## Tabela Final de Módulos

| # | Key | Nome | Type | Preço | includedInCore | hasClientPortal | Routes | Icon | Status | visibleInUpgrade |
|---|-----|------|------|------|----------------|------------------|--------|------|--------|------------------|
| 1 | customers | Clientes | core | R$0 | true | false | /clientes | Users | active | false (sempre incluso) |
| 2 | quotes | Orçamentos | common | R$30 | false | true | /orcamentos | FileText | active | true |
| 3 | service_orders | OS Premium | premium | R$35 | false | true | /ordens-servico | ClipboardList | active | true |
| 4 | scheduling | Agendamento | common | R$20 | false | true | /agendamento | Calendar | active | true |
| 5 | finance | Financeiro | common | R$20 | false | false | /financeiro | BarChart3 | active | true |
| 6 | inventory | Estoque | addon | R$20 | false | false | /estoque | Package | active | true |
| 7 | catalog | Vitrine WhatsApp | addon | R$0 | false | false | /catalogo | ShoppingBag | legacy | false |
| 8 | menu | Cardápio Digital | premium | R$35 | false | true | /cardapio | UtensilsCrossed | coming_soon | true |
| 9 | reports | Relatórios Avançados | addon | R$20 | false | false | /relatorios | PieChart | active | true |
| 10 | users_permissions | Usuários e Permissões | addon | R$20 | false | false | /usuarios | Shield | active | true |

### O que aparece no Upgrade

| Key | Nome | Preço | Por que aparece |
|-----|------|-------|-----------------|
| quotes | Orçamentos | R$30 | common, active, visibleInUpgrade=true |
| service_orders | OS Premium | R$35 | premium, active, visibleInUpgrade=true |
| scheduling | Agendamento | R$20 | common, active, visibleInUpgrade=true |
| finance | Financeiro | R$20 | common, active, visibleInUpgrade=true |
| inventory | Estoque | R$20 | addon, active, visibleInUpgrade=true |
| menu | Cardápio Digital | R$35 | premium, coming_soon, visibleInUpgrade=true (badge "Em breve") |
| reports | Relatórios Avançados | R$20 | addon, active, visibleInUpgrade=true |
| users_permissions | Usuários e Permissões | R$20 | addon, active, visibleInUpgrade=true |

### O que fica OCULTO no Upgrade

| Key | Nome | Por que oculto |
|-----|------|---------------|
| customers | Clientes | core, incluso no plano base |
| catalog | Vitrine WhatsApp | legacy, visibleInUpgrade=false |

### Observações por módulo

- **service_orders** → renomeado para "OS Premium", type=premium, preço R$35. É o módulo principal do AVGESTÃO. OS básica fica dentro do núcleo no futuro.
- **menu** → "Cardápio Digital", type=premium, status=coming_soon. Já existe `/cardapio`, MenuItem, MenuItemForm no sistema. Fica visível no upgrade com badge "Em breve". QR Code + Cozinha ficam para depois.
- **catalog** → renomeado para "Vitrine WhatsApp", status=legacy, visibleInUpgrade=false. Mantido por compatibilidade com dados existentes, mas não aparece no upgrade.
- **reports** → renomeado para "Relatórios Avançados". Relatórios básicos ficam dentro de cada módulo. O módulo pago é dashboard executivo, gráficos, comparações e exportação.

---

## Modelo de Preço

- **Plano base:** R$49/mês = núcleo (Clientes) + 1 módulo à escolha
- **Módulos extras:** 2º=R$30, 3º=R$25, 4º+=R$20
- **OS Premium:** R$35 ( módulo premium com preço próprio)
- **Cardápio Digital:** R$35 (módulo premium com preço próprio)
- Substitui os 3 modelos conflitantes (stripe.ts, pricing.ts, upgrade/page.tsx)
- **Transição Stripe:** manter `PLANS` legado temporariamente até checkout modular estar validado

---

## ARQUIVO 1 — CRIAR `src/lib/modules.ts`

```ts
/**
 * Configuração central de módulos — única fonte de verdade.
 *
 * Todos os metadados, tipos, rotas, ícones e preços vivem aqui.
 * Nenhum outro arquivo deve definir módulos hardcoded.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type ModuleType = "core" | "common" | "premium" | "addon";
export type ModuleStatus = "active" | "coming_soon" | "legacy";

export interface ModuleConfig {
  /** Identificador único do módulo */
  key: string;
  /** Nome de exibição em português */
  name: string;
  /** Descrição curta do módulo */
  description: string;
  /** Categoria do módulo */
  type: ModuleType;
  /** Preço mensal em R$ (0 para core) */
  monthlyPrice: number;
  /** Se vem incluso no plano base (sem custo extra) */
  includedInCore: boolean;
  /** Se terá portal do cliente no futuro */
  hasClientPortal: boolean;
  /** Rotas protegidas por este módulo */
  routes: string[];
  /** Nome do ícone Lucide (para lookup no cliente) */
  icon: string;
  /** Ordem de exibição */
  order: number;
  /** Cor Tailwind para o card ativo */
  color: string;
  /** Benefícios para a página de upgrade */
  benefits: string[];
  /** Status do módulo */
  status: ModuleStatus;
  /** Se aparece na página de upgrade/compra */
  visibleInUpgrade: boolean;
}

// ── Configuração dos módulos ───────────────────────────────────────────────

export const MODULES: ModuleConfig[] = [
  // ── CORE — sempre ativo, sem custo ────────────────────────────────────
  {
    key: "customers",
    name: "Clientes",
    description: "Cadastro e gestão de clientes — base para todos os módulos",
    type: "core",
    monthlyPrice: 0,
    includedInCore: true,
    hasClientPortal: false,
    routes: ["/clientes"],
    icon: "Users",
    order: 1,
    color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
    benefits: [
      "Cadastro completo de clientes",
      "Busca por nome e telefone",
      "Histórico de orçamentos e OS",
    ],
    status: "active",
    visibleInUpgrade: false,
  },

  // ── COMMON — módulos padrão (o plano base inclui 1 à escolha) ─────────
  {
    key: "quotes",
    name: "Orçamentos",
    description: "Crie e envie orçamentos profissionais",
    type: "common",
    monthlyPrice: 30,
    includedInCore: false,
    hasClientPortal: true,
    routes: ["/orcamentos"],
    icon: "FileText",
    order: 2,
    color: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
    benefits: [
      "Itens com cálculo automático",
      "Geração de PDF",
      "Envio pelo WhatsApp",
      "Conversão em OS",
    ],
    status: "active",
    visibleInUpgrade: true,
  },
  {
    key: "service_orders",
    name: "OS Premium",
    description: "Ordens de serviço avançadas com portal do cliente, garantia e previsão de entrega",
    type: "premium",
    monthlyPrice: 35,
    includedInCore: false,
    hasClientPortal: true,
    routes: ["/ordens-servico"],
    icon: "ClipboardList",
    order: 3,
    color: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400",
    benefits: [
      "OS completa com status de acompanhamento",
      "Portal do cliente para acompanhamento",
      "Garantia e previsão de entrega",
      "Fechamento avançado e PDF",
    ],
    status: "active",
    visibleInUpgrade: true,
  },
  {
    key: "scheduling",
    name: "Agendamento",
    description: "Agenda de compromissos e serviços",
    type: "common",
    monthlyPrice: 20,
    includedInCore: false,
    hasClientPortal: true,
    routes: ["/agendamento"],
    icon: "Calendar",
    order: 4,
    color: "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400",
    benefits: [
      "Calendário visual",
      "Lembretes",
      "Agendamento recorrente",
    ],
    status: "active",
    visibleInUpgrade: true,
  },
  {
    key: "finance",
    name: "Financeiro",
    description: "Controle financeiro e fluxo de caixa",
    type: "common",
    monthlyPrice: 20,
    includedInCore: false,
    hasClientPortal: false,
    routes: ["/financeiro"],
    icon: "BarChart3",
    order: 5,
    color: "bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400",
    benefits: [
      "Contas a receber",
      "Contas a pagar",
      "Fluxo de caixa",
    ],
    status: "active",
    visibleInUpgrade: true,
  },

  // ── ADDON — complementos que estendem outros módulos ──────────────────
  {
    key: "inventory",
    name: "Estoque",
    description: "Controle de produtos e materiais em estoque",
    type: "addon",
    monthlyPrice: 20,
    includedInCore: false,
    hasClientPortal: false,
    routes: ["/estoque"],
    icon: "Package",
    order: 6,
    color: "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400",
    benefits: [
      "Cadastro de produtos",
      "Entrada e saída",
      "Alerta de estoque baixo",
    ],
    status: "active",
    visibleInUpgrade: true,
  },
  {
    key: "catalog",
    name: "Vitrine WhatsApp",
    description: "Vitrine de produtos integrada ao WhatsApp (legado)",
    type: "addon",
    monthlyPrice: 0,
    includedInCore: false,
    hasClientPortal: false,
    routes: ["/catalogo"],
    icon: "ShoppingBag",
    order: 7,
    color: "bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400",
    benefits: [
      "Vitrine digital",
      "Integração WhatsApp Business",
      "Compartilhamento fácil",
    ],
    status: "legacy",
    visibleInUpgrade: false,
  },
  {
    key: "menu",
    name: "Cardápio Digital",
    description: "Cardápio digital para restaurantes com QR Code e gestão de itens",
    type: "premium",
    monthlyPrice: 35,
    includedInCore: false,
    hasClientPortal: true,
    routes: ["/cardapio"],
    icon: "UtensilsCrossed",
    order: 8,
    color: "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400",
    benefits: [
      "Cardápio online com QR Code",
      "Gestão de itens e categorias",
      "Atualização em tempo real",
      "Portal do cliente",
    ],
    status: "coming_soon",
    visibleInUpgrade: true,
  },
  {
    key: "reports",
    name: "Relatórios Avançados",
    description: "Dashboard executivo, gráficos, comparações e exportação",
    type: "addon",
    monthlyPrice: 20,
    includedInCore: false,
    hasClientPortal: false,
    routes: ["/relatorios"],
    icon: "PieChart",
    order: 9,
    color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400",
    benefits: [
      "Dashboard executivo",
      "Gráficos e comparações",
      "Exportação de relatórios",
      "Métricas por módulo",
    ],
    status: "active",
    visibleInUpgrade: true,
  },
  {
    key: "users_permissions",
    name: "Usuários e Permissões",
    description: "Gerencie acessos ao sistema",
    type: "addon",
    monthlyPrice: 20,
    includedInCore: false,
    hasClientPortal: false,
    routes: ["/usuarios"],
    icon: "Shield",
    order: 10,
    color: "bg-slate-50 text-slate-600 dark:bg-slate-950/30 dark:text-slate-400",
    benefits: [
      "Múltiplos usuários",
      "Permissões por função",
      "Auditoria de ações",
    ],
    status: "active",
    visibleInUpgrade: true,
  },
];

// ── Derivados — tudo nasce da config, nada duplicado ────────────────────

/** Todos os keys de módulos */
export const MODULE_KEYS = MODULES.map((m) => m.key) as string[];

/** Type union dos keys */
export type ModuleKey = (typeof MODULE_KEYS)[number];

/** Map key → config para lookup O(1) */
export const MODULE_MAP = new Map(MODULES.map((m) => [m.key, m]));

/** Módulos core (sempre ativos) */
export const CORE_MODULES = MODULES.filter((m) => m.type === "core");

/** Módulos disponíveis para contratação (não-core, visíveis no upgrade, não-legacy) */
export const PURCHASABLE_MODULES = MODULES.filter(
  (m) => m.type !== "core" && m.visibleInUpgrade && m.status !== "legacy"
);

/** Módulos ativos (status = active, para uso em guards e sidebar) */
export const ACTIVE_MODULES = MODULES.filter((m) => m.status === "active");

/** Rotas protegidas por módulo — fundido em 1 map */
export const MODULE_ROUTE_MAP = new Map(
  MODULES.flatMap((m) => m.routes.map((r) => [r, m.key] as const))
);

/** Pegar config de um módulo */
export function getModuleConfig(key: string): ModuleConfig | undefined {
  return MODULE_MAP.get(key);
}

/** Verificar se módulo é core (sempre ativo, não pode ser desativado) */
export function isCoreModule(key: string): boolean {
  const config = MODULE_MAP.get(key);
  return config?.type === "core";
}

/** Verificar se módulo está incluso no plano base */
export function isIncludedInCore(key: string): boolean {
  const config = MODULE_MAP.get(key);
  return config?.includedInCore ?? false;
}

/** Verificar se módulo está ativo (não legacy, não coming_soon) */
export function isActiveModule(key: string): boolean {
  const config = MODULE_MAP.get(key);
  return config?.status === "active";
}

/** Obter rota principal de um módulo */
export function getModuleRoute(key: string): string {
  const config = MODULE_MAP.get(key);
  return config?.routes[0] ?? "/dashboard";
}

/** Obter nome de exibição de um módulo */
export function getModuleLabel(key: string): string {
  const config = MODULE_MAP.get(key);
  return config?.name ?? key;
}
```

---

## ARQUIVO 2 — ATUALIZAR `src/types/index.ts`

**Antes:**

```ts
import { UserRole, CompanyStatus } from "@/generated/prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  companyStatus: CompanyStatus;
}

export const MODULE_KEYS = [
  "customers",
  "quotes",
  "service_orders",
  "inventory",
  "scheduling",
  "catalog",
  "menu",
  "finance",
  "reports",
  "users_permissions",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_ROUTES: Record<string, string> = {
  customers: "/clientes",
  quotes: "/orcamentos",
  service_orders: "/ordens-servico",
  inventory: "/estoque",
  scheduling: "/agendamento",
  catalog: "/catalogo",
  menu: "/cardapio",
  finance: "/financeiro",
  reports: "/relatorios",
  users_permissions: "/usuarios",
};
```

**Depois:**

```ts
import { UserRole, CompanyStatus } from "@/generated/prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  companyStatus: CompanyStatus;
}

// Re-export ModuleKey de modules.ts para manter compatibilidade com imports existentes
export type { ModuleKey } from "@/lib/modules";
```

---

## ARQUIVO 3 — REESCREVER `src/lib/pricing.ts`

**Depois:**

```ts
import { isCoreModule, getModuleConfig, CORE_MODULES } from "./modules";

export const BASE_PRICE = 49; // núcleo (Clientes) + 1 módulo incluso

const EXTRA_MODULE_PRICES = [30, 25, 20]; // 2º, 3º, 4º módulo extra
const ADDITIONAL_MODULE_PRICE = 20; // a partir do 5º módulo extra

/**
 * Calcula o preço mensal com base nos módulos ativos.
 * O primeiro módulo não-core está incluso no plano base (R$49).
 * Módulos core são grátis.
 */
export function calculateMonthlyPrice(activeModuleKeys: string[]): number {
  // Filtrar módulos core (são grátis) e legacy (não cobrar)
  const purchasable = activeModuleKeys.filter(
    (k) => !isCoreModule(k) && getModuleConfig(k)?.status !== "legacy"
  );

  if (purchasable.length === 0) return BASE_PRICE;

  // Ordenar por preço descendente para cobrar os mais caros primeiro
  const sortedPrices = purchasable
    .map((k) => getModuleConfig(k)?.monthlyPrice ?? 20)
    .sort((a, b) => b - a);

  // Primeiro módulo incluso no plano base
  let total = BASE_PRICE;
  for (let i = 1; i < sortedPrices.length; i++) {
    const priceIndex = i - 1;
    if (priceIndex < EXTRA_MODULE_PRICES.length) {
      total += EXTRA_MODULE_PRICES[priceIndex];
    } else {
      total += ADDITIONAL_MODULE_PRICE;
    }
  }
  return total;
}

/**
 * Retorna o nome do plano baseado nos módulos ativos.
 */
export function getPlanName(activeModuleKeys: string[]): string {
  const purchasable = activeModuleKeys.filter((k) => !isCoreModule(k));
  const count = purchasable.length;

  if (count <= 0) return "Inicial";
  if (count === 1) return "Inicial";
  if (count === 2) return "Crescimento";
  if (count === 3) return "Profissional";
  return "Completo";
}

export const PLAN_LABELS = [
  { name: "Inicial", modules: 1, price: 49 },
  { name: "Crescimento", modules: 2, price: 79 },
  { name: "Profissional", modules: 3, price: 104 },
  { name: "Completo", modules: 5, price: 144 },
];
```

---

## ARQUIVO 4 — ATUALIZAR `src/lib/stripe.ts`

**Mudança:** Marcar `PLANS` como legado temporariamente. NÃO remover de uma vez até checkout modular estar validado.

**Depois:**

```ts
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY nao configurada");
    }
    _stripe = new Stripe(key, {
      apiVersion: "2026-05-27.dahlia",
    });
  }
  return _stripe;
}

/**
 * @legacy Planos fixos Basic/Pro — manter até checkout modular estar validado.
 * Depois da transição, remover PLANS e usar calculateMonthlyPrice de pricing.ts.
 */
export const PLANS = {
  basic: {
    name: "Básico",
    priceId: process.env.STRIPE_BASIC_PRICE_ID || "",
    description: "3 módulos",
    modules: 3,
    price: 49,
  },
  pro: {
    name: "Profissional",
    priceId: process.env.STRIPE_PRO_PRICE_ID || "",
    description: "Todos os módulos",
    modules: 10,
    price: 99,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
```

> `PLANS` mantido temporariamente. Depois que o checkout modular for validado, remover e usar `calculateMonthlyPrice` de `pricing.ts`.

---

## ARQUIVO 5 — ATUALIZAR `src/lib/module-guard.ts`

**Depois:**

```ts
import { prisma } from "./prisma";
import { MODULE_ROUTE_MAP, CORE_MODULES, isCoreModule } from "./modules";

export function getModuleKeyForPath(pathname: string): string | null {
  for (const [prefix, moduleKey] of MODULE_ROUTE_MAP) {
    if (pathname.startsWith(prefix)) {
      return moduleKey;
    }
  }
  return null;
}

export async function isModuleActive(
  companyId: string,
  moduleKey: string
): Promise<boolean> {
  // Módulos core são sempre ativos
  if (isCoreModule(moduleKey)) return true;

  const companyModule = await prisma.companyModule.findUnique({
    where: {
      companyId_moduleKey: { companyId, moduleKey },
    },
  });
  return companyModule?.active ?? false;
}

export async function getActiveModules(companyId: string): Promise<string[]> {
  const modules = await prisma.companyModule.findMany({
    where: { companyId, active: true },
    select: { moduleKey: true },
  });
  const activeKeys = modules.map((m) => m.moduleKey);

  // Garantir que módulos core sempre estejam presentes
  for (const core of CORE_MODULES) {
    if (!activeKeys.includes(core.key)) {
      activeKeys.push(core.key);
    }
  }

  return activeKeys;
}
```

---

## ARQUIVO 6 — ATUALIZAR `src/lib/api-handler.ts`

**Linha a adicionar no topo:**

```ts
import { isCoreModule } from "./modules";
```

**Função `checkModuleAccess` alterada:**

```ts
async function checkModuleAccess(companyId: string, moduleKey: string): Promise<boolean> {
  // Módulos core são sempre acessíveis
  if (isCoreModule(moduleKey)) return true;

  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_moduleKey: { companyId, moduleKey } },
  });
  return companyModule?.active ?? false;
}
```

O resto do arquivo permanece igual.

---

## ARQUIVO 7 — ATUALIZAR `src/lib/company-limits.ts`

**Linha a adicionar no topo:**

```ts
import type { ModuleKey } from "./modules";
```

Sem outras mudanças estruturais por enquanto.

---

## ARQUIVO 8 — ATUALIZAR `src/hooks/use-modules.ts`

**Depois:**

```ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { MODULES, isCoreModule, type ModuleConfig } from "@/lib/modules";

interface ActiveModule {
  moduleKey: string;
}

interface UseModulesReturn {
  modules: ModuleConfig[];
  activeModules: string[];
  isModuleActive: (key: string) => boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useModules(companyId?: string): UseModulesReturn {
  // Módulos vêm da config central, não da API
  const [modules] = useState<ModuleConfig[]>(MODULES);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Módulos já estão disponíveis via config, não precisa buscar da API
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!companyId) return;
    async function loadActiveModules() {
      try {
        const res = await fetch(`/api/empresas/${companyId}`);
        if (res.ok) {
          const data = await res.json();
          const active = (data.companyModules || [])
            .filter((cm: ActiveModule) => cm.moduleKey)
            .map((cm: ActiveModule) => cm.moduleKey);

          // Garantir que módulos core sempre estejam ativos
          for (const mod of MODULES) {
            if (mod.type === "core" && !active.includes(mod.key)) {
              active.push(mod.key);
            }
          }

          setActiveModules(active);
        }
      } catch {
        // silent
      }
    }
    loadActiveModules();
  }, [companyId]);

  function isModuleActive(key: string): boolean {
    if (isCoreModule(key)) return true;
    return activeModules.includes(key);
  }

  return { modules, activeModules, isModuleActive, loading, error, refresh: load };
}
```

---

## ARQUIVO 9 — ATUALIZAR `src/components/layout/dashboard-sidebar.tsx`

Mudanças:
- Remover `MODULE_ICONS`, `MODULE_LABELS`, `MODULE_ROUTES` hardcoded
- Importar de `@/lib/modules`
- Criar `ICON_MAP` local mapeando string → componente Lucide
- Adicionar ícone `UtensilsCrossed` (para menu)
- Filtrar módulos legacy e coming_soon da sidebar (ou mostrar desabilitado)

**Imports a adicionar:**

```ts
import { MODULES, isActiveModule } from "@/lib/modules";
```

**Remover as 3 constantes hardcoded:** `MODULE_ICONS`, `MODULE_LABELS`, `MODULE_ROUTES`

**Adicionar ICON_MAP local (incluindo UtensilsCrossed para menu):**

```ts
import {
  // ... imports existentes ...
  UtensilsCrossed,
} from "lucide-react";

// Mapa de ícones — a única duplicação necessária (React precisa de componentes)
const ICON_MAP: Record<string, React.ElementType> = {
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
};
```

**Alterar geração de navItems:**

```ts
for (const mod of MODULES) {
  if (activeModules.has(mod.key) && isActiveModule(mod.key)) {
    navItems.push({
      key: mod.key,
      label: mod.name,
      href: mod.routes[0],
      icon: ICON_MAP[mod.icon] || Building2,
    });
  }
}
```

---

## ARQUIVO 10 — ATUALIZAR `src/components/layout/module-card.tsx`

**Imports a alterar:** remover hardcoded, adicionar:

```ts
import { getModuleConfig, getModuleRoute } from "@/lib/modules";
import { UtensilsCrossed } from "lucide-react";
```

**Remover:** `MODULE_ICON_MAP`, `ACTIVE_COLORS`, `getRoute()` function

**Adicionar ICON_MAP local:**

```ts
const ICON_MAP: Record<string, React.ElementType> = {
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
};
```

**Alterar o componente** para usar config central:

```ts
export function ModuleCard({ moduleKey, name, description, active }: ModuleCardProps) {
  const config = getModuleConfig(moduleKey);
  const Icon = ICON_MAP[config?.icon || ""] || Zap;
  const colorClass = config?.color || "bg-muted text-muted-foreground";
  const displayName = config?.name || name;
  const displayDesc = config?.description || description;

  // ... resto do componente usa displayName, displayDesc, colorClass

  if (active) {
    return (
      <Link href={getModuleRoute(moduleKey)} className="block group">
        {/* ... mesmo JSX mas usando colorClass, displayName, displayDesc */}
```

---

## ARQUIVO 11 — ATUALIZAR `src/app/(dashboard)/dashboard/page.tsx`

**Imports a alterar:** remover `MODULE_KEYS` e `ModuleKey` de `@/types`, adicionar:

```ts
import { MODULES, isActiveModule } from "@/lib/modules";
import type { ModuleKey } from "@/lib/modules";
```

**Remover:** `MODULE_INFO` constante hardcoded

**Alterar a renderização dos cards:**

```tsx
{MODULES.filter(m => m.status !== "legacy").map((mod, index) => {
  const isActive = activeModuleMap.get(mod.key) ?? false;
  return (
    <MotionItem key={mod.key} delay={index * 0.03}>
      <ModuleCard
        moduleKey={mod.key as ModuleKey}
        name={mod.name}
        description={mod.description}
        active={isActive}
      />
    </MotionItem>
  );
})}
```

> Módulos `legacy` (catalog) não aparecem no dashboard. Módulos `coming_soon` (menu) aparecem com badge "Em breve".

---

## ARQUIVO 12 — ATUALIZAR `src/app/(dashboard)/upgrade/page.tsx`

**Imports a alterar:** remover `MODULE_KEYS` e `ModuleKey` de `@/types`, adicionar:

```ts
import { PURCHASABLE_MODULES, getModuleConfig, BASE_PRICE } from "@/lib/modules";
import { calculateMonthlyPrice } from "@/lib/pricing";
import type { ModuleKey } from "@/lib/modules";
```

**Remover:** `MODULE_DESCRIPTIONS` e `PLANS` hardcoded

**Reconstruir a UI:** Mostrar módulos de `PURCHASABLE_MODULES` com preço individual. Módulos `coming_soon` mostram badge "Em breve" e botão desabilitado. Plano base R$49.

---

## ARQUIVO 13 — ATUALIZAR `src/app/(admin)/admin/modulos/page.tsx`

**Import a adicionar:**

```ts
import { getModuleConfig, isActiveModule } from "@/lib/modules";
```

Adicionar coluna "Tipo" mostrando Core/Common/Premium/Addon.

Adicionar coluna "Status" mostrando Active/Coming Soon/Legacy.

Se `isCoreModule(mod.key)`, o toggle "Ativo" fica desabilitado.

---

## ARQUIVO 14 — ATUALIZAR `src/app/api/empresas/[id]/route.ts`

**Import a adicionar:**

```ts
import { isCoreModule } from "@/lib/modules";
```

No handler PUT, quando receber `moduleKey` + `moduleActive`:

```ts
if (moduleKey && isCoreModule(moduleKey)) {
  return NextResponse.json({ error: "Nao e possivel desativar modulo core" }, { status: 400 });
}
```

---

## ARQUIVO 15 — ATUALIZAR `src/app/api/stripe/checkout/route.ts`

**Import a adicionar:**

```ts
import { calculateMonthlyPrice } from "@/lib/pricing";
```

**Nota sobre transição:** Por enquanto, manter suporte a `{ plan }` legado E `{ moduleKeys }` novo. Depois de validado, remover o legado.

```ts
const body = await request.json();
const { plan, moduleKey, moduleKeys } = body;

// Fluxo novo (modular)
if (moduleKeys && Array.isArray(moduleKeys) && moduleKeys.length > 0) {
  const monthlyPrice = calculateMonthlyPrice(moduleKeys);
  // ... criar checkout com preço dinâmico
}
// Fluxo legado (Basic/Pro) — remover depois de validado
else if (plan && PLANS[plan as PlanKey]) {
  // ... fluxo antigo
}
```

---

## ARQUIVO 16 — ATUALIZAR `src/app/api/stripe/webhook/route.ts`

**Import a adicionar:**

```ts
import { CORE_MODULES } from "@/lib/modules";
```

**No `customer.subscription.deleted`, alterar:**

```ts
// Antes: desativar TODOS os módulos
// Depois: desativar todos EXCETO core
await prisma.companyModule.updateMany({
  where: {
    companyId: deletedCompany.id,
    moduleKey: { notIn: CORE_MODULES.map((m) => m.key) },
  },
  data: { active: false, deactivatedAt: new Date() },
});
```

---

## ARQUIVO 17 — ATUALIZAR `prisma/seed.ts`

**Import a adicionar:**

```ts
import { MODULES } from "../src/lib/modules";
```

**Remover** o array `moduleData` hardcoded e substituir por:

```ts
for (const mod of MODULES) {
  await prisma.module.upsert({
    where: { key: mod.key },
    update: { name: mod.name, description: mod.description, basePrice: mod.monthlyPrice, sortOrder: mod.order },
    create: { key: mod.key, name: mod.name, description: mod.description, basePrice: mod.monthlyPrice, sortOrder: mod.order, active: mod.status === "active" },
  });
}
```

> Módulos `coming_soon` e `legacy` são criados com `active: false`. Módulos `active` são criados com `active: true`.

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Imports quebrados de `ModuleKey` de `@/types` | Re-exportar `ModuleKey` de `modules.ts` via `types/index.ts` |
| Stripe checkout espera `{ plan }` fixo | Manter `PLANS` legado temporariamente; checkout suporta ambos os fluxos |
| Webhook desativa todos os módulos ao cancelar | Filtrar com `isCoreModule()` para nunca desativar core |
| Ícones não renderizam com string | Manter `ICON_MAP` local que mapeia string → componente Lucide |
| `catalog` (legacy) ainda tem rota e dados existentes | Mantido na config com `status: "legacy"`, `visibleInUpgrade: false`. Não aparece no upgrade mas funciona se já ativado |
| `menu` (coming_soon) já tem `/cardapio`, MenuItem, MenuItemForm | Mantido na config com `status: "coming_soon"`, `visibleInUpgrade: true` com badge. Rota e componentes existentes continuam funcionando |
| `service_orders` renomeado para "OS Premium" | Key permanece `service_orders` (não quebra banco). Apenas label muda |
| Sidebar mostra módulos legacy | Filtrar com `isActiveModule()` para não mostrar legacy na sidebar |

---

## Como Testar

1. `npm run build` — deve compilar sem erros
2. Sidebar mostra módulos ativos + Clientes sempre; NÃO mostra Vitrine WhatsApp (legacy)
3. Dashboard mostra cards ativos/inativos; NÃO mostra Vitrine WhatsApp; mostra Cardápio Digital com badge "Em breve"
4. Upgrade mostra apenas módulos com `visibleInUpgrade=true`; Vitrine WhatsApp NÃO aparece
5. OS Premium aparece com nome "OS Premium" e preço R$35
6. API retorna 403 para módulo inativo, mas nunca para Clientes (core)
7. Stripe checkout aceita tanto `{ plan }` legado quanto `{ moduleKeys }` novo
8. Cancelar assinatura desativa tudo EXCETO Clientes
9. Admin pode editar módulos mas não desativar core
10. Cardápio Digital aparece no upgrade com badge "Em breve", botão desabilitado

---

## O que NÃO muda (preservado)

- NextAuth
- RLS / tenantPrisma
- ActivityLog
- Stripe (fluxo de checkout/webhook mantido, PLANS legado preservado até transição)
- Resend
- Rotas existentes (/cardapio, /catalogo, /ordens-servico continuam funcionando)
- Funcionalidades existentes
- MenuItem e MenuItemForm (continuam funcionando normalmente)