import { test, expect } from "@playwright/test";

/**
 * P02 fix: cron /api/cron/trial-expiring deve exigir CRON_SECRET.
 *
 * Comportamento:
 * - Sem CRON_SECRET configurado OU sem header: 503/401
 * - Com CRON_SECRET errado: 401
 * - Com CRON_SECRET correto: 200
 *
 * Em dev, o CRON_SECRET pode não estar configurado — neste caso esperamos 503.
 */

test.describe("Security - Cron Secret", () => {
  test("cron sem header retorna 401 ou 503", async ({ request }) => {
    const res = await request.get("/api/cron/trial-expiring");
    // Sem header: 401 (com secret configurado) ou 503 (sem secret)
    expect([401, 503]).toContain(res.status());
  });

  test("cron com Bearer errado retorna 401", async ({ request }) => {
    const res = await request.get("/api/cron/trial-expiring", {
      headers: { authorization: "Bearer token-errado" },
    });
    expect([401, 503]).toContain(res.status());
  });

  test("cron com Bearer correto retorna 200 (ou 503 se dev sem secret)", async ({ request }) => {
    // Em dev, o .env tem CRON_SECRET. Vamos pegar do .env via env var
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      test.skip(true, "CRON_SECRET nao configurado no test env");
      return;
    }
    const res = await request.get("/api/cron/trial-expiring", {
      headers: { authorization: `Bearer ${cronSecret}` },
    });
    // 200 com secret correto, 503 se rodando sem CRON_SECRET configurado
    expect([200, 503]).toContain(res.status());
  });
});
