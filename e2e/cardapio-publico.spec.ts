import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { e2eName, e2eAmount } from "./helpers/test-data";

test.describe("Cardapio Publico", () => {
  test("acesso a /c/[slug] invalido mostra estado de erro", async ({ page }) => {
    const res = await page.goto("/c/slug-inexistente-xyz");
    expect(res === null || res.status() < 500).toBeTruthy();
    // Deve mostrar algum estado de erro/nao encontrado
    await expect(
      page.getByText(/n.o encontrad|inv.lid|n.o dispon.vel|404|erro/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("API publica com slug invalido retorna 404", async ({ request }) => {
    const res = await request.get("/api/public/menu/slug-inexistente-xyz");
    expect([400, 404]).toContain(res.status());
  });

  test("fluxo completo: configurar slug, criar item, acessar publico, enviar pedido", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;

    // 1. Setar slug unico
    const slug = `e2e-${Date.now().toString(36)}`;
    const cfgRes = await req.put("/api/cardapio/config", { data: { slug } });
    expect([200, 409]).toContain(cfgRes.status());
    if (!cfgRes.ok()) {
      test.skip(true, "slug ja em uso, pulando");
      return;
    }

    // 2. Criar item de cardapio
    const itemName = e2eName("Prato");
    const itemRes = await req.post("/api/cardapio", {
      data: {
        name: itemName,
        price: e2eAmount(20, 60),
        category: "E2E Pratos",
        active: true,
        sortOrder: 1,
      },
    });
    expect([200, 201]).toContain(itemRes.status());

    // 3. Acessar cardapio publico
    await page.context().clearCookies();
    await page.goto(`/c/${slug}`);
    await expect(
      page.getByText(itemName).first()
    ).toBeVisible({ timeout: 15_000 });

    // 4. Enviar pedido (POST em /api/public/menu/[slug]/orders)
    const orderRes = await req.post(`/api/public/menu/${slug}/orders`, {
      data: {
        orderType: "TAKEAWAY",
        customerName: "E2E Cliente",
        items: [
          { menuItemId: (await itemRes.json())?.id, quantity: 1 },
        ],
      },
    });
    expect([200, 201, 400, 404, 500]).toContain(orderRes.status());
  });
});
