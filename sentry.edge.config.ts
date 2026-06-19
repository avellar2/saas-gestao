import * as Sentry from "@sentry/nextjs";

/**
 * Filtros de PII para Sentry edge (middleware).
 * Mesmo padrao dos outros configs.
 */

const SENSITIVE_KEYS = [
  "password",
  "senha",
  "pass",
  "token",
  "authorization",
  "cookie",
  "session",
  "secret",
];

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const CPF_RE = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g;
const CNPJ_RE = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;
const PHONE_BR_RE = /(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}/g;

const REDACTED = "[REDACTED]";

function stripPiiFromString(input: string): string {
  if (typeof input !== "string") return input;
  return input
    .replace(EMAIL_RE, REDACTED)
    .replace(CPF_RE, REDACTED)
    .replace(CNPJ_RE, REDACTED)
    .replace(PHONE_BR_RE, REDACTED);
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((s) => lower === s.toLowerCase() || lower.includes(s.toLowerCase()));
}

function beforeSend(event: Sentry.ErrorEvent, _hint: Sentry.EventHint): Sentry.ErrorEvent | null {
  if (event.user) {
    if (event.user.email) event.user.email = REDACTED;
    if (event.user.ip_address) event.user.ip_address = REDACTED;
  }
  if (event.extra) {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(event.extra)) {
      clean[k] = isSensitiveKey(k) ? REDACTED : v;
    }
    event.extra = clean;
  }
  if (event.request) {
    if (event.request.url) {
      event.request.url = stripPiiFromString(event.request.url);
    }
    if (event.request.cookies) {
      const cookies: Record<string, string> = {};
      for (const k of Object.keys(event.request.cookies)) {
        cookies[k] = REDACTED;
      }
      event.request.cookies = cookies;
    }
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
