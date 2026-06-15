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

test.describe("Clientes CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("deve listar clientes", async ({ page }) => {
    await page.goto("/clientes");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("deve criar um novo cliente", async ({ page }) => {
    await page.goto("/clientes/novo");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });

    const nome = `Cliente Teste ${Date.now()}`;
    await page.fill("#name", nome);
    await page.fill("#phone", "(11) 99999-9999");
    await page.fill("#whatsapp", "(11) 99999-9999");
    await page.fill("#email", `teste${Date.now()}@email.com`);
    await page.fill("#document", "123.456.789-00");
    await page.fill("#address", "Rua Teste, 123");
    await page.fill("#notes", "Cliente criado pelo Playwright");

    await page.click("button[type=submit]");

    // Deve redirecionar para listagem
    await page.waitForURL(/\/clientes$/, { timeout: 15000 });
    await expect(page.locator(`text=${nome}`)).toBeVisible({ timeout: 5000 });
  });

  test("deve exibir detalhes de um cliente", async ({ page }) => {
    await page.goto("/clientes");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });

    // Clica no primeiro link de cliente na tabela
    const clientLink = page.locator("table a").first();
    await expect(clientLink).toBeVisible({ timeout: 5000 });
    await clientLink.click();
    await page.waitForURL(/\/clientes\//, { timeout: 10000 });
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });
});
