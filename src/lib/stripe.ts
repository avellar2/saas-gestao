import Stripe from "stripe";

// ── Stripe Client ──────────────────────────────────────────────────────────

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

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

// ── Module → Price ID mapping ──────────────────────────────────────────────
// Each purchasable module has its own Stripe Price ID configured via env vars.
// The base price (R$49) covers core + 1 included module.
// Additional modules are charged per their individual monthly price.

const MODULE_PRICE_MAP: Record<string, string> = {
  quotes: process.env.STRIPE_MODULE_QUOTES_PRICE_ID || "",
  service_orders: process.env.STRIPE_MODULE_SERVICE_ORDERS_PRICE_ID || "",
  scheduling: process.env.STRIPE_MODULE_SCHEDULING_PRICE_ID || "",
  finance: process.env.STRIPE_MODULE_FINANCE_PRICE_ID || "",
  inventory: process.env.STRIPE_MODULE_INVENTORY_PRICE_ID || "",
  menu: process.env.STRIPE_MODULE_MENU_PRICE_ID || "",
  reports: process.env.STRIPE_MODULE_REPORTS_PRICE_ID || "",
  users_permissions: process.env.STRIPE_MODULE_USERS_PERMISSIONS_PRICE_ID || "",
};

const BASE_PRICE_ID = process.env.STRIPE_BASE_PRICE_ID || "";

/**
 * Get the Stripe Price ID for a given module key.
 * Returns null for core/legacy/coming_soon modules or if the env var is not set.
 */
export function getModulePriceId(moduleKey: string): string | null {
  if (!MODULE_PRICE_MAP[moduleKey]) return null;
  if (MODULE_PRICE_MAP[moduleKey] === "") return null;
  return MODULE_PRICE_MAP[moduleKey];
}

/**
 * Get the Stripe Price ID for the base plan (R$49/mo).
 */
export function getBasePriceId(): string | null {
  if (!BASE_PRICE_ID || BASE_PRICE_ID === "") return null;
  return BASE_PRICE_ID;
}

/**
 * Map a Stripe Price ID back to a module key.
 * Returns null for the base price or unknown prices.
 */
export function getModuleKeyFromPriceId(priceId: string): string | null {
  for (const [key, pid] of Object.entries(MODULE_PRICE_MAP)) {
    if (pid === priceId) return key;
  }
  // Check if it's the base price
  if (priceId === BASE_PRICE_ID) return "__base__";
  return null;
}

// ── Setup Validation ───────────────────────────────────────────────────────

interface SetupValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that all required Stripe Price IDs are configured.
 * Run this at startup or before any Stripe operation.
 * Returns a list of errors (blocking) and warnings (non-blocking).
 */
export function validateStripeSetup(): SetupValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required: base price
  if (!BASE_PRICE_ID) {
    errors.push("STRIPE_BASE_PRICE_ID nao configurada. O plano base (R$49) requer um Price ID.");
  }

  // Required: all purchasable module price IDs
  const purchasableModules = [
    { key: "quotes", name: "Orcamentos", env: "STRIPE_MODULE_QUOTES_PRICE_ID" },
    { key: "service_orders", name: "OS Premium", env: "STRIPE_MODULE_SERVICE_ORDERS_PRICE_ID" },
    { key: "scheduling", name: "Agendamento", env: "STRIPE_MODULE_SCHEDULING_PRICE_ID" },
    { key: "finance", name: "Financeiro", env: "STRIPE_MODULE_FINANCE_PRICE_ID" },
    { key: "inventory", name: "Estoque", env: "STRIPE_MODULE_INVENTORY_PRICE_ID" },
    { key: "menu", name: "Cardapio Digital", env: "STRIPE_MODULE_MENU_PRICE_ID" },
    { key: "reports", name: "Relatorios", env: "STRIPE_MODULE_REPORTS_PRICE_ID" },
    { key: "users_permissions", name: "Usuarios e Permissoes", env: "STRIPE_MODULE_USERS_PERMISSIONS_PRICE_ID" },
  ];

  for (const mod of purchasableModules) {
    if (!MODULE_PRICE_MAP[mod.key]) {
      errors.push(`${mod.env} nao configurada. Modulo "${mod.name}" nao podera ser comprado.`);
    }
  }

  // Warning: secret key
  if (!process.env.STRIPE_SECRET_KEY) {
    errors.push("STRIPE_SECRET_KEY nao configurada. Nenhuma operacao Stripe funcionara.");
  }

  // Warning: webhook secret
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    warnings.push("STRIPE_WEBHOOK_SECRET nao configurada. Webhooks nao serao validados.");
  }

  // Warning: legacy price IDs still present
  if (process.env.STRIPE_BASIC_PRICE_ID) {
    warnings.push("STRIPE_BASIC_PRICE_ID ainda configurada (legado). Remova apos confirmar que nao ha assinaturas Basic ativas.");
  }
  if (process.env.STRIPE_PRO_PRICE_ID) {
    warnings.push("STRIPE_PRO_PRICE_ID ainda configurada (legado). Remova apos confirmar que nao ha assinaturas Pro ativas.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ── Legacy compatibility ─────────────────────────────────────────────────────
// These are kept temporarily for any existing subscriptions using the old model.
// They should be removed once the transition to modular pricing is complete.

export const LEGACY_PLANS = {
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

export type LegacyPlanKey = keyof typeof LEGACY_PLANS;

/**
 * Check if a subscription's price ID belongs to a legacy plan.
 * Used in webhook processing to handle legacy subscriptions differently.
 */
export function isLegacyPriceId(priceId: string): boolean {
  return (
    priceId === LEGACY_PLANS.basic.priceId ||
    priceId === LEGACY_PLANS.pro.priceId
  );
}