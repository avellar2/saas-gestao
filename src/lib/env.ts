/**
 * Validação de variáveis de ambiente.
 *
 * Em produção, aborta o boot se variáveis críticas estiverem ausentes
 * ou com valores placeholder/inseguros.
 *
 * Em desenvolvimento, apenas avisa no console.
 *
 * Segurança:
 * - AUTH_SECRET não pode ser placeholder
 * - STRIPE_WEBHOOK_SECRET OBRIGATÓRIO em produção
 * - CRON_SECRET não pode ser vazio em prod
 * - NEXTAUTH_URL não pode ser localhost em prod
 * - POSTGRES_PASSWORD OBRIGATÓRIO em produção
 * - SEED_ADMIN_PASSWORD OBRIGATÓRIO em produção se seed for rodar
 */

const PLACEHOLDER_VALUES = new Set([
  "change-me-in-production",
  "change-me-to-a-random-secret-in-production",
  "secret",
  "changeme",
  "test",
  "dev",
  "gestor_prod_123",
  "gestor123",
  "admin123",
  "password",
]);

const isPlaceholder = (val: string | undefined): boolean => {
  if (!val) return true;
  if (PLACEHOLDER_VALUES.has(val)) return true;
  if (val.length < 32) return true; // secrets devem ser >= 32 chars
  return false;
};

const isWeakPassword = (val: string | undefined): boolean => {
  if (!val) return true;
  if (val.length < 16) return true;
  if (PLACEHOLDER_VALUES.has(val)) return true;
  return false;
};

interface EnvCheck {
  name: string;
  value: string | undefined;
  required: boolean;
  validate?: (val: string) => boolean;
  message: string;
}

const PRODUCTION_CHECKS: EnvCheck[] = [
  {
    name: "AUTH_SECRET",
    value: process.env.AUTH_SECRET,
    required: true,
    validate: (v) => !isPlaceholder(v),
    message:
      "AUTH_SECRET deve estar configurado com um valor aleatório de pelo menos 32 caracteres. " +
      "Gere com: openssl rand -base64 32",
  },
  {
    name: "NEXTAUTH_URL",
    value: process.env.NEXTAUTH_URL,
    required: true,
    validate: (v) => v.startsWith("https://"),
    message:
      "NEXTAUTH_URL deve estar configurado com a URL publica (https:// em producao). " +
      "http://localhost NAO e aceito em producao.",
  },
  {
    name: "DATABASE_URL",
    value: process.env.DATABASE_URL,
    required: true,
    validate: (v) => v.length > 10 && v.includes("://"),
    message: "DATABASE_URL deve estar configurado (formato: postgresql://...).",
  },
  {
    name: "POSTGRES_PASSWORD",
    value: process.env.POSTGRES_PASSWORD,
    required: true,
    validate: (v) => v.length >= 16 && !PLACEHOLDER_VALUES.has(v),
    message:
      "POSTGRES_PASSWORD deve estar configurada com senha forte (>=16 chars, sem placeholder).",
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    value: process.env.STRIPE_WEBHOOK_SECRET,
    required: true, // OBRIGATORIO em prod (consistencia com P17)
    validate: (v) => v.length >= 16 && v.startsWith("whsec_"),
    message:
      "STRIPE_WEBHOOK_SECRET deve estar configurado (comeca com whsec_, >=16 chars). " +
      "Sem ele, webhooks aceitam qualquer evento (risco de fraude).",
  },
  {
    name: "CRON_SECRET",
    value: process.env.CRON_SECRET,
    required: true,
    validate: (v) => v.length >= 16,
    message:
      "CRON_SECRET deve estar configurado para proteger endpoints de cron. " +
      "Gere com: openssl rand -base64 32",
  },
  {
    name: "STRIPE_SECRET_KEY",
    value: process.env.STRIPE_SECRET_KEY,
    required: false, // opcional, mas se usar checkout/portal, obrigatorio
    validate: (v) => v.startsWith("sk_live_") || v.startsWith("sk_test_"),
    message:
      "STRIPE_SECRET_KEY deve comecar com sk_live_ (producao) ou sk_test_ (dev). " +
      "Em producao, USE sk_live_.",
  },
  {
    name: "SEED_ADMIN_PASSWORD",
    value: process.env.SEED_ADMIN_PASSWORD,
    required: false, // obrigatorio apenas se seed for rodar
    validate: (v) => !isWeakPassword(v),
    message:
      "SEED_ADMIN_PASSWORD deve ter pelo menos 16 caracteres e nao ser placeholder " +
      "(necessario se seed for executado em producao).",
  },
];

/**
 * Valida o ambiente. Em produção, lança erro. Em dev, apenas loga warnings.
 * Esta função é executada no boot via imports.
 */
export function validateEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const check of PRODUCTION_CHECKS) {
    const value = check.value;
    const isMissing = !value;
    const isInvalid = value && check.validate && !check.validate(value);

    if (check.required && isMissing) {
      errors.push(`[${check.name}] OBRIGATORIO: ${check.message}`);
    } else if (isInvalid) {
      if (check.required) {
        errors.push(`[${check.name}] INVALIDO: ${check.message}`);
      } else {
        warnings.push(`[${check.name}] AVISO: ${check.message}`);
      }
    } else if (!check.required && isMissing) {
      // variavel opcional ausente: ok, nao avisar
    }
  }

  if (warnings.length > 0) {
    console.warn("AVISOS DE AMBIENTE:");
    for (const w of warnings) console.warn(`  - ${w}`);
  }

  if (errors.length > 0) {
    console.error("ERROS CRITICOS DE AMBIENTE EM PRODUCAO:");
    for (const e of errors) console.error(`  - ${e}`);
    throw new Error(
      `Ambiente de producao mal configurado. ${errors.length} erro(s) critico(s). Verifique o .env.`
    );
  }
}

/**
 * Validação preguiçosa de variáveis específicas (para usar em runtime).
 * Não aborta, apenas retorna booleanos.
 */
export function isProductionReady(): {
  authSecret: boolean;
  nextauthUrl: boolean;
  databaseUrl: boolean;
  postgresPassword: boolean;
  stripeWebhookSecret: boolean;
  cronSecret: boolean;
  stripeSecretKey: boolean;
  seedAdminPassword: boolean;
} {
  const check = (val: string | undefined, validator?: (v: string) => boolean) => {
    if (!val) return false;
    if (validator && !validator(val)) return false;
    return true;
  };
  return {
    authSecret: check(process.env.AUTH_SECRET, (v) => !isPlaceholder(v)),
    nextauthUrl: check(process.env.NEXTAUTH_URL, (v) => v.startsWith("https://")),
    databaseUrl: check(process.env.DATABASE_URL, (v) => v.length > 10),
    postgresPassword: check(process.env.POSTGRES_PASSWORD, (v) => v.length >= 16),
    stripeWebhookSecret: check(process.env.STRIPE_WEBHOOK_SECRET, (v) => v.length >= 16),
    cronSecret: check(process.env.CRON_SECRET, (v) => v.length >= 16),
    stripeSecretKey: check(process.env.STRIPE_SECRET_KEY, (v) => v.startsWith("sk_")),
    seedAdminPassword: check(process.env.SEED_ADMIN_PASSWORD, (v) => !isWeakPassword(v)),
  };
}

// Executa validação no import (somente em produção E em runtime, nao em build)
const isProductionRuntime =
  process.env.NODE_ENV === "production" &&
  !process.env.NEXT_PHASE; // NEXT_PHASE e setada durante next build

if (isProductionRuntime) {
  try {
    validateEnv();
  } catch (err) {
    // Em produção, falhamos alto. Em outros contextos, o erro é capturado pelo Next.js.
    // Re-throw para garantir que o processo não inicia.
    throw err;
  }
}
