import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { ROUTES } from "./helpers/selectors";

test.describe("Mobile Smoke", () => {
  test("login funciona em mobile", async ({ page }) => {
    await login(page, "active_admin");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("dashboard carrega em mobile", async ({ page }) => {
    await login(page, "active_admin");
    await page.goto(ROUTES.dashboard);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("lista de OS carrega em mobile", async ({ page }) => {
    await login(page, "active_admin");
    await page.goto(ROUTES.os);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("detalhe de OS carrega em mobile", async ({ page }) => {
    await login(page, "active_admin");
    // Em mobile, pode haver layout diferente; navega direto
    const list = await page.request.get("/api/ordens-servico");
    const body = await list.json();
    const first = Array.isArray(body) ? body[0] : body?.serviceOrders?.[0];
    if (first?.id) {
      await page.goto(`/ordens-servico/${first.id}`);
      await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
    } else {
      // Fallback: tenta clicar
      await page.goto(ROUTES.os);
      const link = page.locator('a[href*="/ordens-servico/"]').first();
      await expect(link).toBeVisible({ timeout: 5_000 });
    }
  });

  test("cardapio publico carrega em mobile", async ({ page, request }) => {
    // Pega slug via API
    await login(page, "active_admin");
    const cfg = await page.request.get("/api/cardapio/config");
    if (cfg.ok()) {
      const data = await cfg.json();
      if (data?.slug) {
        await page.context().clearCookies();
        await page.goto(`/c/${data.slug}`);
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });

  test("portal OS com token invalido carrega em mobile sem erro 500", async ({ page }) => {
    const res = await page.goto("/portal/os/token-invalido-mobile");
    expect(res === null || res.status() < 500).toBeTruthy();
  });
});
