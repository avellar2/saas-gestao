import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Sentry wrapper (only if DSN is configured)
let config = nextConfig;
try {
  const { withSentryConfig } = require("@sentry/nextjs");
  if (process.env.SENTRY_DSN) {
    config = withSentryConfig(config, {
      org: process.env.SENTRY_ORG || "",
      project: process.env.SENTRY_PROJECT || "gestor-local",
      silent: true,
      hideSourceMaps: true,
      widenClientFileUpload: true,
    });
  }
} catch {
  // Sentry not configured, use plain config
}

export default config;
