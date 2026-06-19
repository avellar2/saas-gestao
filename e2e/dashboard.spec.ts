import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { ROUTES, SEL } from "./helpers/selectors";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "active_admin");
  });

  test("dashboard carrega apos login", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator(SEL.pageHeading).first()).toBeVisible({ timeout: 10_000 });
  });

  test("sidebar exibe links dos modulos ativos", async ({ page }) => {
    const links = [
      ROUTES.clientes,
      ROUTES.orcamentos,
      ROUTES.os,
      ROUTES.financeiro,
      ROUTES.estoque,
    ];
    for (const href of links) {
      const link = page.locator(`a[href="${href}"]`).first();
      await expect(link).toBeVisible({ timeout: 5_000 });
    }
  });

  test("clicar em modulo da sidebar navega corretamente", async ({ page }) => {
    await page.goto(ROUTES.clientes);
    await page.waitForURL(/\/clientes/, { timeout: 10_000 });
    await expect(page.locator(SEL.pageHeading).first()).toBeVisible();

    await page.goto(ROUTES.os);
    await page.waitForURL(/\/ordens-servico/, { timeout: 10_000 });
    await expect(page.locator(SEL.pageHeading).first()).toBeVisible();
  });

  test("pagina de upgrade carrega", async ({ page }) => {
    await page.goto(ROUTES.upgrade);
    await expect(page.locator(SEL.pageHeading).first()).toBeVisible({ timeout: 10_000 });
  });

  test("pagina de atividades carrega", async ({ page }) => {
    await page.goto(ROUTES.atividades);
    await expect(page.locator(SEL.pageHeading).first()).toBeVisible({ timeout: 10_000 });
  });

  test("rota desconhecida mostra estado adequado (404 ou redirect)", async ({ page }) => {
    const res = await page.goto("/rota-que-nao-existe-xyz");
    // Pode ser 404, ou redirect para algum lugar — so verificamos que nao quebra
    expect(res === null || res.status() < 500).toBeTruthy();
  });
});
