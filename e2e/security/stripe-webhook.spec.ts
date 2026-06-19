import { test, expect } from "@playwright/test";

/**
 * P17 fix: webhook Stripe deve exigir STRIPE_WEBHOOK_SECRET.
 *
 * Sem assinatura válida ou sem secret configurado, o webhook é bloqueado.
 */

test.describe("Security - Stripe Webhook", () => {
  test("webhook sem assinatura retorna 400 ou 503", async ({ request }) => {
    const res = await request.post("/api/stripe/webhook", {
      data: { type: "test" },
    });
    // 400 = signature inválida, 503 = secret não configurado
    expect([400, 503]).toContain(res.status());
  });

  test("webhook com assinatura fake retorna 400", async ({ request }) => {
    const res = await request.post("/api/stripe/webhook", {
      headers: { "stripe-signature": "fake-signature" },
      data: { type: "test" },
    });
    expect([400, 503]).toContain(res.status());
  });
});
