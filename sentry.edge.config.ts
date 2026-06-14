import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV || "development",
  enabled: process.env.NODE_ENV === "production" && !!process.env.SENTRY_DSN,
});
