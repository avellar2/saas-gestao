import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { e2eName } from "./helpers/test-data";

/**
 * Testes de regressão:
 * - BUG-019/031: estoque saida valida quantidade > estoque; entrada valida positive
 * - BUG-013: filtros ativos/inativos no backend
 */

test.describe("Auditoria 13C - Estoque", () => {
  test("BUG-019: saida nao deixa estoque negativo", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;

    // Cria produto com estoque 5
    const name = e2eName("Peca-S");
    const created = await req.post("/api/estoque", {
      data: { name, quantity: 5, salePrice: 10, minStock: 0 },
    });
    expect([200, 201]).toContain(created.status());
    const productId = (await created.json())?.id;
    expect(productId).toBeTruthy();

    // Tenta saída de 100 (muito mais que 5) — deve falhar
    const saida = await req.post(`/api/estoque/${productId}/saida`, {
      data: { quantity: 100, description: "E2E saida invalida" },
    });
    expect(saida.status()).toBe(409);

    // Tenta saída de 3 — deve passar
    const saidaOK = await req.post(`/api/estoque/${productId}/saida`, {
      data: { quantity: 3, description: "E2E saida OK" },
    });
    expect([200, 201]).toContain(saidaOK.status());

    // Verifica estoque = 2
    const get = await req.get("/api/estoque?limit=500");
    const list = await get.json();
    const p = list.products.find((x: { id: string }) => x.id === productId);
    expect(p?.quantity).toBe(2);

    // Tenta saída de 5 (mais que o atual 2) — deve falhar
    const saidaMaior = await req.post(`/api/estoque/${productId}/saida`, {
      data: { quantity: 5, description: "E2E saida maior" },
    });
    expect(saidaMaior.status()).toBe(409);
  });

  test("BUG-031: entrada com quantidade zero ou negativa falha", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;

    const name = e2eName("Peca-E");
    const created = await req.post("/api/estoque", {
      data: { name, quantity: 10, salePrice: 10 },
    });
    expect([200, 201]).toContain(created.status());
    const productId = (await created.json())?.id;

    // Entrada com 0 — deve falhar
    const e0 = await req.post(`/api/estoque/${productId}/entrada`, {
      data: { quantity: 0, description: "E2E zero" },
    });
    expect(e0.status()).toBe(400);

    // Entrada com negativo — deve falhar
    const en = await req.post(`/api/estoque/${productId}/entrada`, {
      data: { quantity: -5, description: "E2E negativo" },
    });
    expect(en.status()).toBe(400);

    // Entrada válida — deve passar
    const e5 = await req.post(`/api/estoque/${productId}/entrada`, {
      data: { quantity: 5, description: "E2E ok" },
    });
    expect([200, 201]).toContain(e5.status());
  });

  test("BUG-013: filtro ativos/inativos funciona via API", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;

    const ativos = await req.get("/api/estoque?stockFilter=ativos&limit=500");
    expect(ativos.ok()).toBeTruthy();
    const ativosBody = await ativos.json();
    for (const p of ativosBody.products) {
      expect(p.active).toBe(true);
    }

    const inativos = await req.get("/api/estoque?stockFilter=inativos&limit=500");
    expect(inativos.ok()).toBeTruthy();
    const inativosBody = await inativos.json();
    for (const p of inativosBody.products) {
      expect(p.active).toBe(false);
    }
  });
});
