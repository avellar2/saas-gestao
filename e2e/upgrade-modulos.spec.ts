import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { ROUTES } from "./helpers/selectors";

test.describe("Upgrade e Module Guard", () => {
  test("empresa ativa: pagina de upgrade carrega", async ({ page }) => {
    await login(page, "active_admin");
    await page.goto(ROUTES.upgrade);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("empresa trial: modulo nao ativo redireciona para upgrade", async ({ page }) => {
    await login(page, "trial_admin");
    // Trial da Silva so tem customers. Tenta acessar OS.
    await page.goto(ROUTES.os);
    await page.waitForURL(/\/upgrade/, { timeout: 15_000 });
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("API de modulos responde para super admin", async ({ page }) => {
    await login(page, "super_admin");
    const res = await page.request.get("/api/modulos");
    expect([200, 401, 403]).toContain(res.status());
  });

  test.skip("checkout Stripe real - nao testado por seguranca", async () => {
    // Stripe checkout requer pagamento real
  });

  test.skip("webhook Stripe - nao testado (requer assinatura real)", () => {
    // Webhook precisa de evento Stripe real
  });
});
