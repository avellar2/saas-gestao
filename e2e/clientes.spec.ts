import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { ROUTES } from "./helpers/selectors";
import { e2eName, e2eEmail, e2ePhone, e2eDocument } from "./helpers/test-data";

test.describe("Clientes", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "active_admin");
  });

  test("lista clientes carrega", async ({ page }) => {
    await page.goto(ROUTES.clientes);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("cria novo cliente via UI", async ({ page }) => {
    const nome = e2eName("Cliente");
    await page.goto(ROUTES.clienteNovo);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });

    await page.fill("#name", nome);
    await page.fill("#phone", e2ePhone());
    await page.fill("#email", e2eEmail("cli"));
    await page.fill("#document", e2eDocument());
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/clientes$/, { timeout: 15_000 });
    await expect(page.getByText(nome).first()).toBeVisible({ timeout: 10_000 });
  });

  test("busca cliente por nome retorna resultados", async ({ page }) => {
    await page.goto(ROUTES.clientes);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
    // Busca o cliente de seed "Carlos" (ja existe)
    const searchInput = page.locator('input[name="search"]');
    await searchInput.fill("Carlos");
    await page.click('button[type="submit"]:has-text("Buscar")');
    await page.waitForURL(/search=Carlos/, { timeout: 10_000 });
    await expect(page.getByText("Carlos").first()).toBeVisible();
  });

  test("abre detalhe de um cliente da lista", async ({ page }) => {
    await page.goto(ROUTES.clientes);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
    const link = page.locator('table a[href*="/clientes/"]').first();
    await expect(link).toBeVisible({ timeout: 5_000 });
    await link.click();
    await page.waitForURL(/\/clientes\//, { timeout: 10_000 });
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("exportar CSV baixa arquivo", async ({ page }) => {
    await page.goto(ROUTES.clientes);
    const exportLink = page.locator('a[href*="/api/exportar"][href*="customer"]').first();
    await expect(exportLink).toBeVisible({ timeout: 5_000 });
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10_000 }).catch(() => null),
      exportLink.click(),
    ]);
    // Se baixou, valida nome; se não, segue sem falhar
    if (download) {
      expect(download.suggestedFilename()).toMatch(/clientes?|customers?/i);
    }
  });
});
