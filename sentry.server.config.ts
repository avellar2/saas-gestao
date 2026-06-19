import * as Sentry from "@sentry/nextjs";

/**
 * Filtros de PII para Sentry server-side.
 *
 * Impede que dados sensiveis (senhas, tokens, cookies, etc) cheguem
 * ao Sentry via request body, headers, query, ou extra context.
 *
 * NAO derruba erros legitimos. Apenas remove propriedades sensiveis.
 */

const SENSITIVE_KEYS = [
  "password",
  "senha",
  "pass",
  "pwd",
  "token",
  "authorization",
  "cookie",
  "set-cookie",
  "session",
  "reset_token",
  "resetToken",
  "stripe-signature",
  "stripe_signature",
  "webhook_secret",
  "webhookSecret",
  "secret",
  "api_key",
  "apiKey",
  "access_token",
  "accessToken",
  "refresh_token",
  "refreshToken",
  "credit_card",
  "creditCard",
  "cvv",
  "cvc",
];

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE_BR_RE = /(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}/g;
const CPF_RE = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g;
const CNPJ_RE = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;
const BEARER_RE = /Bearer\s+[\w-]+/gi;

const REDACTED = "[REDACTED]";

function stripPiiFromString(input: string): string {
  if (typeof input !== "string") return input;
  return input
    .replace(EMAIL_RE, REDACTED)
    .replace(CPF_RE, REDACTED)
    .replace(CNPJ_RE, REDACTED)
    .replace(PHONE_BR_RE, REDACTED)
    .replace(BEARER_RE, "Bearer [REDACTED]");
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((s) => lower === s.toLowerCase() || lower.includes(s.toLowerCase()));
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[MAX_DEPTH]";

  if (value === null || value === undefined) return value;
  if (typeof value === "string") return stripPiiFromString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    return value.map((v) => sanitizeValue(v, depth + 1));
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(k)) {
        result[k] = REDACTED;
      } else {
        result[k] = sanitizeValue(v, depth + 1);
      }
    }
    return result;
  }

  return value;
}

function beforeSend(event: Sentry.ErrorEvent, _hint: Sentry.EventHint): Sentry.ErrorEvent | null {
  if (event.request) {
    if (event.request.cookies) {
      const cookies: Record<string, string> = {};
      for (const k of Object.keys(event.request.cookies)) {
        cookies[k] = REDACTED;
      }
      event.request.cookies = cookies;
    }
    if (event.request.headers) {
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(event.request.headers)) {
        if (isSensitiveKey(k)) {
          headers[k] = REDACTED;
        } else {
          headers[k] = typeof v === "string" ? stripPiiFromString(v) : String(v);
        }
      }
      event.request.headers = headers;
    }
    if (event.request.data) {
      event.request.data = sanitizeValue(event.request.data);
    }
    if (event.request.query_string) {
      if (typeof event.request.query_string === "string") {
        event.request.query_string = stripPiiFromString(event.request.query_string);
      }
    }
  }

  if (event.extra) {
    event.extra = sanitizeValue(event.extra) as Record<string, unknown>;
  }
  if (event.user) {
    if (event.user.email) event.user.email = REDACTED;
    if (event.user.ip_address) event.user.ip_address = REDACTED;
  }
  if (event.contexts) {
    event.contexts = sanitizeValue(event.contexts) as typeof event.contexts;
  }

  return event;
}

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV || "development",
  enabled: process.env.NODE_ENV === "production" && !!process.env.SENTRY_DSN,
  beforeSend,
});
