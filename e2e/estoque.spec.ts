import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { ROUTES } from "./helpers/selectors";
import { e2eName, e2eAmount } from "./helpers/test-data";

test.describe("Estoque", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "active_admin");
  });

  test("dashboard do estoque carrega", async ({ page }) => {
    await page.goto(ROUTES.estoque);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("lista de produtos carrega", async ({ page }) => {
    await page.goto(ROUTES.estoque + "/produtos");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("movimentacoes carrega", async ({ page }) => {
    await page.goto(ROUTES.estoque + "/movimentacoes");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("cria novo produto via UI", async ({ page }) => {
    await page.goto(ROUTES.estoqueNovo);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });

    const name = e2eName("Produto");
    await page.fill("#name", name);
    const sku = page.locator("#sku").first();
    if (await sku.isVisible().catch(() => false)) {
      await sku.fill(`SKU-${Date.now()}`);
    }
    const cat = page.locator("#category").first();
    if (await cat.isVisible().catch(() => false)) {
      await cat.fill("E2E Categoria");
    }
    const qty = page.locator("#quantity").first();
    if (await qty.isVisible().catch(() => false)) {
      await qty.fill("20");
    }
    const min = page.locator("#minStock").first();
    if (await min.isVisible().catch(() => false)) {
      await min.fill("5");
    }
    const cost = page.locator("#costPrice").first();
    if (await cost.isVisible().catch(() => false)) {
      await cost.fill("10");
    }
    const sale = page.locator("#salePrice").first();
    if (await sale.isVisible().catch(() => false)) {
      await sale.fill("25");
    }

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/estoque/, { timeout: 15_000 });
  });

  test("abre detalhe de um produto", async ({ page }) => {
    await page.goto(ROUTES.estoque + "/produtos");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
    const link = page.locator('table a[href*="/estoque/"]').first();
    if (await link.isVisible().catch(() => false)) {
      await link.click();
      await page.waitForURL(/\/estoque\//, { timeout: 10_000 });
      await expect(page.locator("h1, h2").first()).toBeVisible();
    }
  });

  test("cria produto e da entrada de estoque via API", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;

    const name = e2eName("Produto");
    const created = await req.post("/api/estoque", {
      data: {
        name,
        sku: `SKU-${Date.now()}`,
        category: "E2E",
        quantity: 10,
        minStock: 2,
        costPrice: 10,
        salePrice: 25,
      },
    });
    expect([200, 201]).toContain(created.status());
    const body = await created.json();
    const productId = body?.id ?? body?.data?.id;
    expect(productId).toBeTruthy();

    // Entrada
    const inRes = await req.post(`/api/estoque/${productId}/entrada`, {
      data: { quantity: 5, description: "E2E entrada" },
    });
    expect([200, 201]).toContain(inRes.status());

    // Verificar resumo
    const summary = await req.get("/api/estoque/resumo");
    expect([200, 403]).toContain(summary.status());
  });
});
