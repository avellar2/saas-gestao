import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { ROUTES } from "./helpers/selectors";
import { e2eName, e2eAmount } from "./helpers/test-data";

test.describe("Cardapio Admin", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "active_admin");
  });

  test("cardapio admin carrega", async ({ page }) => {
    await page.goto(ROUTES.cardapio);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("cria item de cardapio via UI", async ({ page }) => {
    await page.goto(ROUTES.cardapioNovo);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
    const name = e2eName("Item");
    await page.fill("#name", name);
    const price = page.locator("#price").first();
    if (await price.isVisible().catch(() => false)) {
      await price.fill(String(e2eAmount(10, 100)));
    }
    const cat = page.locator("#category").first();
    if (await cat.isVisible().catch(() => false)) {
      await cat.fill("E2E Cat");
    }
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cardapio/, { timeout: 15_000 });
  });

  test("cria item via API", async ({ page }) => {
    const req = page.request;
    const name = e2eName("Item");
    const res = await req.post("/api/cardapio", {
      data: {
        name,
        price: e2eAmount(15, 80),
        category: "E2E API",
        active: true,
      },
    });
    expect([200, 201]).toContain(res.status());
  });

  test("configuracao de slug via API", async ({ page }) => {
    const req = page.request;
    const slug = `e2e-${Date.now().toString(36)}`;
    const res = await req.put("/api/cardapio/config", {
      data: { slug },
    });
    expect([200, 400, 409]).toContain(res.status());

    if (res.ok()) {
      const get = await req.get("/api/cardapio/config");
      expect(get.ok()).toBeTruthy();
      const cfg = await get.json();
      expect(cfg.slug).toBe(slug);
    }
  });

  test("paginas de sub-rotas do cardapio carregam", async ({ page }) => {
    for (const route of [ROUTES.cardapioMesas, ROUTES.cardapioCozinha, ROUTES.cardapioPedidos, ROUTES.cardapioCaixa, ROUTES.cardapioConfig]) {
      await page.goto(route);
      await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
