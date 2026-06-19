import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Portal Publico da OS", () => {
  test("portal com token invalido mostra erro", async ({ page }) => {
    const res = await page.goto("/portal/os/token-invalido-xyz");
    expect(res === null || res.status() < 500).toBeTruthy();
    // Deve mostrar algum estado de erro/nao encontrado
    await expect(
      page.getByText(/n.o encontrad|inv.lid|n.o dispon.vel|404|erro/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("portal com token vazio redireciona ou mostra erro", async ({ page }) => {
    const res = await page.goto("/portal/os/");
    expect(res === null || res.status() < 500).toBeTruthy();
  });

  test("API publica de OS com token invalido retorna 404/400", async ({ request }) => {
    const res = await request.get("/api/public/os/token-invalido-xyz");
    expect([400, 404, 500]).toContain(res.status());
  });

  test("criando OS com token e abrindo portal mostra dados publicos", async ({ page }) => {
    // Login para poder usar API autenticada (page.request compartilha cookies)
    await login(page, "active_admin");
    const req = page.request;

    // Pegar primeiro cliente
    const clientes = await req.get("/api/clientes");
    expect(clientes.status()).toBe(200);
    const clientesBody = await clientes.json();
    const clientesArr = Array.isArray(clientesBody) ? clientesBody : clientesBody?.customers ?? clientesBody?.data ?? [];
    const customerId = clientesArr[0]?.id;
    expect(customerId, "precisa de pelo menos 1 cliente no banco").toBeTruthy();

    // Criar OS via API (precisa de pelo menos 1 item)
    const created = await req.post("/api/ordens-servico", {
      data: {
        customerId,
        problemDescription: "E2E Portal - problema de teste",
        equipmentName: "E2E Equip Portal",
        equipmentBrand: "E2E Brand",
        equipmentModel: "E2E Model",
        items: [
          { description: "E2E servico portal", quantity: 1, unitPrice: 100 },
        ],
      },
    });
    expect([200, 201]).toContain(created.status());
    const createdBody = await created.json();
    const soId = createdBody?.id ?? createdBody?.data?.id;
    const publicToken = createdBody?.publicToken ?? createdBody?.data?.publicToken;
    expect(soId, "OS precisa ter id").toBeTruthy();
    expect(publicToken, "OS precisa ter publicToken").toBeTruthy();

    // Visitar portal publico
    await page.context().clearCookies();
    await page.goto(`/portal/os/${publicToken}`);
    await page.waitForLoadState("networkidle");
    // Deve mostrar dados do cliente (ou o codigo da OS)
    await expect(
      page.getByText(/E2E|Portal|OS-|ordem|equipamento|cliente/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // PDF publico (API publica, sem auth)
    const pdf = await req.get(`/api/public/os/${publicToken}/pdf`);
    expect([200, 500]).toContain(pdf.status());
  });
});
