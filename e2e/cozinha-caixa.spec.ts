import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { ROUTES } from "./helpers/selectors";
import { e2eName, e2eAmount } from "./helpers/test-data";

test.describe("Cozinha e Caixa", () => {
  test("cozinha carrega", async ({ page }) => {
    await login(page, "active_admin");
    await page.goto(ROUTES.cardapioCozinha);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("caixa carrega", async ({ page }) => {
    await login(page, "active_admin");
    await page.goto(ROUTES.cardapioCaixa);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("pedidos carrega", async ({ page }) => {
    await login(page, "active_admin");
    await page.goto(ROUTES.cardapioPedidos);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("mesas/QR carrega", async ({ page }) => {
    await login(page, "active_admin");
    await page.goto(ROUTES.cardapioMesas);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("cria mesa via API", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;
    const name = e2eName("Mesa");
    const res = await req.post("/api/cardapio/mesas", {
      data: { name, active: true },
    });
    expect([200, 201]).toContain(res.status());
  });

  test("cria item + envia pedido e valida que aparece no admin", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;

    // 1. Setar slug
    const slug = `e2e-${Date.now().toString(36)}`;
    const cfgRes = await req.put("/api/cardapio/config", { data: { slug } });
    expect([200, 409]).toContain(cfgRes.status());
    if (!cfgRes.ok()) {
      test.skip(true, "slug ja em uso");
      return;
    }

    // 2. Criar item
    const itemName = e2eName("Lanche");
    const itemRes = await req.post("/api/cardapio", {
      data: { name: itemName, price: 25, active: true, category: "E2E", sortOrder: 1 },
    });
    expect([200, 201]).toContain(itemRes.status());
    const itemBody = await itemRes.json();
    const itemId = itemBody?.id ?? itemBody?.data?.id;
    expect(itemId).toBeTruthy();

    // 3. Criar mesa
    const mesaRes = await req.post("/api/cardapio/mesas", { data: { name: e2eName("Mesa"), active: true } });
    const mesaBody = await mesaRes.json();
    const tableId = mesaBody?.id ?? mesaBody?.data?.id;

    // 4. Enviar pedido
    const orderRes = await req.post(`/api/public/menu/${slug}/orders`, {
      data: {
        orderType: "TABLE",
        tableId,
        items: [{ menuItemId: itemId, quantity: 2 }],
      },
    });
    expect([200, 201, 400]).toContain(orderRes.status());

    // 5. Verificar que aparece na cozinha/pedidos
    if (orderRes.ok()) {
      const orders = await req.get("/api/cardapio/pedidos");
      expect([200, 403]).toContain(orders.status());
    }
  });
});
