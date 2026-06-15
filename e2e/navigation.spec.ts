import { test, expect } from "@playwright/test";

const ACTIVE = { email: "marcos@mecanicacentral.com", password: "marcos123" };

async function login(page) {
  await page.goto("/login");
  await page.waitForSelector("#email", { state: "visible", timeout: 10000 });
  await page.fill("#email", ACTIVE.email);
  await page.fill("#password", ACTIVE.password);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

test.describe("Navegacao", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("deve navegar pelos modulos principais pela sidebar", async ({ page }) => {
    const modulos = [
      { nome: "Clientes", url: "/clientes" },
      { nome: "Orcamentos", url: "/orcamentos" },
      { nome: "Ordem de Servico", url: "/ordens-servico" },
    ];

    for (const modulo of modulos) {
      const link = page.locator(`a[href="${modulo.url}"]`).first();
      await expect(link).toBeVisible({ timeout: 5000 });
      await link.click();
      await page.waitForURL(`**${modulo.url}`, { timeout: 10000 });
      await expect(page.locator("h1, h2").first()).toBeVisible();
    }
  });

  test("deve acessar pagina de upgrade", async ({ page }) => {
    await page.goto("/upgrade");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });
});
