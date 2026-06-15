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

// ── ModuleKey — union type explícito e forte ────────────────────────────────

export type ModuleKey =
  | "customers"
  | "quotes"
  | "service_orders"
  | "scheduling"
  | "finance"
  | "inventory"
  | "catalog"
  | "menu"
  | "reports"
  | "users_permissions";

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
export const MODULE_KEYS = MODULES.map((m) => m.key) as ModuleKey[];

/** Map key → config para lookup O(1) */
export const MODULE_MAP = new Map(MODULES.map((m) => [m.key, m]));

/** Módulos core (sempre ativos) */
export const CORE_MODULES = MODULES.filter((m) => m.type === "core");

/** Módulos disponíveis para contratação (não-core, visíveis no upgrade, não-legacy) */
export const PURCHASABLE_MODULES = MODULES.filter(
  (m) => m.type !== "core" && m.visibleInUpgrade && m.status !== "legacy"
);

/** Módulos ativos (status = active) */
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

/** Verificar se módulo está ativo (pode ser comprado/usado) */
export function isActiveModule(key: string): boolean {
  const config = MODULE_MAP.get(key);
  return config?.status === "active";
}

/** Verificar se um módulo pode ser comprado (active, não-core, visível no upgrade) */
export function isPurchasable(key: string): boolean {
  const config = MODULE_MAP.get(key);
  if (!config) return false;
  return config.type !== "core" && config.visibleInUpgrade && config.status === "active";
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