/**
 * Validador de variaveis de ambiente.
 *
 * - Valida envs obrigatorias para o ambiente atual (dev ou prod)
 * - NAO imprime valores de secrets
 * - NAO imprime DATABASE_URL completo
 * - Falha com exit code 1 se houver erro
 *
 * Uso:
 *   npm run check-env          # valida o .env local
 *   NODE_ENV=production npm run check-env   # valida em modo prod
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

const ENV_FILE = resolve(process.cwd(), ".env");
if (existsSync(ENV_FILE)) {
  loadDotenv({ path: ENV_FILE, override: false });
}

const isProd = process.env.NODE_ENV === "production";

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
  "re_GERAR_NO_RESEND",
  "sk_live_GERAR_NO_STRIPE_DASHBOARD",
  "sk_test_GERAR_NO_STRIPE_DASHBOARD",
  "whsec_GERAR_NO_STRIPE_DASHBOARD",
  "price_GERAR_NO_STRIPE_DASHBOARD",
  "GERAR_NO_SENTRY",
  "GERAR_SENHA_FORTE",
  "GERAR_COM_OPENSSL_RAND_BASE64_24",
  "GERAR_COM_OPENSSL_RAND_BASE64_32",
]);

const isPlaceholder = (val: string | undefined): boolean => {
  if (!val) return true;
  if (PLACEHOLDER_VALUES.has(val)) return true;
  if (val.includes("GERAR") || val.includes("COLE_AQUI") || val.includes("xxxxx")) return true;
  return false;
};

const isWeakSecret = (val: string | undefined, minLen: number): boolean => {
  if (!val) return true;
  if (val.length < minLen) return true;
  if (PLACEHOLDER_VALUES.has(val)) return true;
  return false;
};

interface Check {
  name: string;
  required: boolean;
  validate: (val: string | undefined) => boolean;
  message: string;
  level: "error" | "warning";
}

const DEV_CHECKS: Check[] = [
  {
    name: "DATABASE_URL",
    required: true,
    validate: (v) => !!v && v.includes("://"),
    message: "DATABASE_URL deve estar configurado (formato postgresql://...)",
    level: "error",
  },
  {
    name: "AUTH_SECRET",
    required: true,
    validate: (v) => !isWeakSecret(v, 32),
    message: "AUTH_SECRET deve ter pelo menos 32 chars (use openssl rand -base64 32)",
    level: "error",
  },
  {
    name: "NEXTAUTH_URL",
    required: true,
    validate: (v) => !!v && (v.startsWith("https://") || v.startsWith("http://localhost")),
    message: "NEXTAUTH_URL deve estar configurado",
    level: "error",
  },
  {
    name: "RESEND_API_KEY",
    required: false,
    validate: (v) => !v || v.length >= 16,
    message: "RESEND_API_KEY deve ter pelo menos 16 chars se configurado",
    level: "warning",
  },
];

const PROD_CHECKS: Check[] = [
  ...DEV_CHECKS,
  {
    name: "POSTGRES_PASSWORD",
    required: true,
    validate: (v) => !isWeakSecret(v, 16),
    message: "POSTGRES_PASSWORD deve ter pelo menos 16 chars e nao ser placeholder",
    level: "error",
  },
  {
    name: "CRON_SECRET",
    required: true,
    validate: (v) => !isWeakSecret(v, 16),
    message: "CRON_SECRET deve ter pelo menos 16 chars (use openssl rand -base64 32)",
    level: "error",
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    required: true,
    validate: (v) => !!v && v.length >= 16 && v.startsWith("whsec_"),
    message: "STRIPE_WEBHOOK_SECRET deve comecar com whsec_ e ter pelo menos 16 chars",
    level: "error",
  },
  {
    name: "STRIPE_SECRET_KEY",
    required: false,
    validate: (v) => !v || v.startsWith("sk_live_") || v.startsWith("sk_test_"),
    message: "STRIPE_SECRET_KEY deve comecar com sk_live_ (prod) ou sk_test_ (dev)",
    level: "warning",
  },
  {
    name: "SEED_ADMIN_PASSWORD",
    required: false,
    validate: (v) => !v || !isWeakSecret(v, 16),
    message: "SEED_ADMIN_PASSWORD deve ter pelo menos 16 chars se seed for rodar",
    level: "warning",
  },
  {
    name: "NEXTAUTH_URL",
    required: true,
    validate: (v) => !!v && v.startsWith("https://") && !v.includes("localhost"),
    message: "NEXTAUTH_URL em producao DEVE ser https:// e NAO pode ser localhost",
    level: "error",
  },
];

function run(): number {
  const checks = isProd ? PROD_CHECKS : DEV_CHECKS;
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log(`[check-env] Modo: ${isProd ? "PRODUCAO" : "DESENVOLVIMENTO"}`);
  console.log(`[check-env] Arquivo .env: ${existsSync(ENV_FILE) ? "OK" : "NAO ENCONTRADO"}`);
  console.log("");

  for (const check of checks) {
    const value = process.env[check.name];
    const isMissing = !value;
    const isInvalid = value && !check.validate(value);
    const isPlaceholderValue = value && isPlaceholder(value);

    if (check.required && (isMissing || isInvalid || isPlaceholderValue)) {
      errors.push(`[${check.name}] ${check.message}`);
    } else if (isInvalid || isPlaceholderValue) {
      warnings.push(`[${check.name}] ${check.message}`);
    }
  }

  if (errors.length > 0) {
    console.error("ERROS ENCONTRADOS:");
    for (const e of errors) console.error(`  - ${e}`);
  }

  if (warnings.length > 0) {
    console.warn("AVISOS:");
    for (const w of warnings) console.warn(`  - ${w}`);
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log("Todas as variaveis de ambiente estao OK.");
    return 0;
  }

  if (errors.length > 0) {
    console.error(`\n[check-env] FALHOU: ${errors.length} erro(s) critico(s).`);
    return 1;
  }

  console.log(`\n[check-env] OK com ${warnings.length} aviso(s).`);
  return 0;
}

const code = run();
process.exit(code);
