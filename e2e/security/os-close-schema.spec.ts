import { test, expect } from "@playwright/test";
import { login } from "../helpers/auth";

/**
 * P25 fix: closeServiceOrderSchema rejeita finalStatus=CANCELLED.
 *
 * Após o fix, o enum aceita apenas READY, DELIVERED, COMPLETED.
 */

test.describe("Security - OS Close Schema", () => {
  test("close com finalStatus CANCELLED retorna 422 (schema)", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;

    // Pega cliente e cria OS
    const cli = await req.get("/api/clientes?limit=10");
    const customerId = (await cli.json())?.customers?.[0]?.id;

    const os = await req.post("/api/ordens-servico", {
      data: {
        customerId,
        problemDescription: "E2E close schema test",
        items: [{ description: "teste", quantity: 1, unitPrice: 50 }],
      },
    });
    expect([200, 201]).toContain(os.status());
    const osId = (await os.json()).id;

    // Status para IN_PROGRESS primeiro
    await req.put(`/api/ordens-servico/${osId}`, {
      data: { status: "IN_PROGRESS" },
    });

    // Tenta fechar com finalStatus CANCELLED — schema rejeita
    const close = await req.patch(`/api/ordens-servico/${osId}/close`, {
      data: {
        finalStatus: "CANCELLED",
        finalAmount: 50,
        paymentStatus: "PENDING",
        completedAt: new Date().toISOString(),
        warrantyEnabled: false,
      },
    });
    expect(close.status()).toBe(422);
  });

  test("close com finalStatus COMPLETED funciona", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;

    const cli = await req.get("/api/clientes?limit=10");
    const customerId = (await cli.json())?.customers?.[0]?.id;

    const os = await req.post("/api/ordens-servico", {
      data: {
        customerId,
        problemDescription: "E2E close complete",
        items: [{ description: "teste", quantity: 1, unitPrice: 50 }],
      },
    });
    const osId = (await os.json()).id;

    await req.put(`/api/ordens-servico/${osId}`, {
      data: { status: "IN_PROGRESS" },
    });

    const close = await req.patch(`/api/ordens-servico/${osId}/close`, {
      data: {
        finalStatus: "COMPLETED",
        finalAmount: 50,
        paymentStatus: "PENDING",
        completedAt: new Date().toISOString(),
        warrantyEnabled: false,
      },
    });
    expect([200, 201]).toContain(close.status());
  });
});
