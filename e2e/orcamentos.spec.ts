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

test.describe("Orcamentos", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("deve listar orcamentos", async ({ page }) => {
    await page.goto("/orcamentos");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("deve exibir detalhes de um orcamento", async ({ page }) => {
    await page.goto("/orcamentos");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });

    const quoteLink = page.locator("table a").first();
    await expect(quoteLink).toBeVisible({ timeout: 5000 });
    await quoteLink.click();
    await page.waitForURL(/\/orcamentos\//, { timeout: 10000 });
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });
});
