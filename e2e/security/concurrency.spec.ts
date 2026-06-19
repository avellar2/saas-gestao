import { test, expect } from "@playwright/test";
import { login } from "../helpers/auth";

/**
 * P05 fix: concorrência no fechamento de OS não pode duplicar transação.
 *
 * Estratégia: usar SERIALIZABLE isolation no upsert. Se 2 requests
 * simultâneos tentarem criar tx, o segundo falha com erro de serialização
 * e o helper faz retry (encontrando a tx já criada).
 *
 * Este teste simula concorrência via 2 requests sequenciais sem delay.
 * Como Playwright é single-threaded por padrão, simulamos a race fazendo
 * ambos POSTs imediatamente. O SERIALIZABLE garante atomicidade.
 */

test.describe("Security - Concurrency", () => {
  test("dois fechamentos simultâneos não duplicam transação", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;

    // Cria OS
    const cli = await req.get("/api/clientes?limit=10");
    const customerId = (await cli.json())?.customers?.[0]?.id;

    const os = await req.post("/api/ordens-servico", {
      data: {
        customerId,
        problemDescription: "E2E concurrent close",
        items: [{ description: "teste", quantity: 1, unitPrice: 100 }],
      },
    });
    const osId = (await os.json()).id;

    await req.put(`/api/ordens-servico/${osId}`, {
      data: { status: "IN_PROGRESS" },
    });

    // Dispara 2 fechamentos em paralelo
    const closePayload = {
      finalStatus: "COMPLETED",
      finalAmount: 100,
      paymentStatus: "PAID",
      completedAt: new Date().toISOString(),
      warrantyEnabled: false,
    };
    const [r1, r2] = await Promise.all([
      req.patch(`/api/ordens-servico/${osId}/close`, { data: closePayload }),
      req.patch(`/api/ordens-servico/${osId}/close`, { data: closePayload }),
    ]);

    // Pelo menos um deve ter sucesso (200/201), e o segundo pode falhar
    // (409 conflict ou retry interno) — mas não pode ter criado duas tx.
    const successCount = [r1, r2].filter((r) => [200, 201].includes(r.status())).length;
    expect(successCount).toBeGreaterThanOrEqual(1);

    // Verifica que só existe UMA transação financeira ativa para esta OS
    const txList = await req.get(`/api/financeiro?type=RECEIVABLE&limit=500`);
    const txBody = await txList.json();
    const txForOS = (txBody?.transactions ?? []).filter(
      (t: { serviceOrderId: string; status: string }) =>
        t.serviceOrderId === osId && t.status !== "CANCELLED"
    );
    expect(txForOS.length).toBe(1);
  });
});
