import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { ROUTES } from "./helpers/selectors";

test.describe("Relatorios", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "active_admin");
  });

  test("relatorios home carrega", async ({ page }) => {
    await page.goto(ROUTES.relatorios);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("relatorio executivo carrega", async ({ page }) => {
    await page.goto(ROUTES.relatorios + "/executivo");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("relatorio financeiro carrega", async ({ page }) => {
    await page.goto(ROUTES.relatorios + "/financeiro");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("relatorio de OS carrega", async ({ page }) => {
    await page.goto(ROUTES.relatorios + "/os");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("relatorio de cardapio carrega", async ({ page }) => {
    await page.goto(ROUTES.relatorios + "/cardapio");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("relatorio de estoque carrega", async ({ page }) => {
    await page.goto(ROUTES.relatorios + "/estoque");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("relatorio de clientes carrega", async ({ page }) => {
    await page.goto(ROUTES.relatorios + "/clientes");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("API de modulos ativos responde", async ({ page }) => {
    const res = await page.request.get("/api/relatorios/modules-ativos");
    expect([200, 401, 403]).toContain(res.status());
  });

  test("API de relatorio executivo responde", async ({ page }) => {
    const res = await page.request.get("/api/relatorios/executivo");
    expect([200, 401, 403]).toContain(res.status());
  });
});
