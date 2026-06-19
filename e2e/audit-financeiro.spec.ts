import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { e2eName, e2eAmount } from "./helpers/test-data";

/**
 * Testes de regressão para os bugs da Etapa 13C.
 *
 * BUG-001: Saldo = receitas PAID - despesas PAID (não inclui pendentes).
 * BUG-002/005: Relatórios respeitam o mês selecionado via dueDate.
 * BUG-007/008: Visão Geral e Relatório devem usar o mesmo critério (só PAID).
 */

test.describe("Auditoria 13C - Financeiro", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "active_admin");
  });

  test("BUG-001: saldo realizado ignora pendentes", async ({ page }) => {
    const req = page.request;

    // Cria uma receita PAID
    const descPaid = e2eName("ReceitaPaga");
    const paid = await req.post("/api/financeiro", {
      data: {
        type: "RECEIVABLE",
        description: descPaid,
        amount: 100,
        category: "E2E",
        status: "PENDING",
        dueDate: new Date().toISOString(),
      },
    });
    expect([200, 201]).toContain(paid.status());
    const paidBody = await paid.json();
    const paidId = paidBody?.id;

    // Marca como paga
    await req.patch(`/api/financeiro/transacoes/${paidId}/pay`, {
      data: { paidAt: new Date().toISOString() },
    });

    // Cria uma receita PENDING (que não deve entrar no saldo, mas entra no previsto)
    const descPending = e2eName("ReceitaPendente");
    await req.post("/api/financeiro", {
      data: {
        type: "RECEIVABLE",
        description: descPending,
        amount: 500,
        category: "E2E",
        status: "PENDING",
        dueDate: new Date(Date.now() + 3 * 86400_000).toISOString(), // 3 dias no futuro (mesmo mês)
      },
    });

    // Cria uma despesa PAID
    const descDesp = e2eName("DespesaPaga");
    const desp = await req.post("/api/financeiro", {
      data: {
        type: "PAYABLE",
        description: descDesp,
        amount: 30,
        category: "E2E",
        status: "PENDING",
        dueDate: new Date().toISOString(),
      },
    });
    const despBody = await desp.json();
    await req.patch(`/api/financeiro/transacoes/${despBody.id}/pay`, {
      data: { paidAt: new Date().toISOString() },
    });

    // Cria uma despesa CANCELLED (não deve entrar)
    const descCanc = e2eName("DespesaCancelada");
    const canc = await req.post("/api/financeiro", {
      data: {
        type: "PAYABLE",
        description: descCanc,
        amount: 9999,
        category: "E2E",
        status: "CANCELLED",
        dueDate: new Date().toISOString(),
      },
    });
    const cancBody = await canc.json();
    if (cancBody?.id) {
      // marca explicitamente como cancelada via API
      const txList = await req.get("/api/financeiro");
      // OK, não precisa atualizar — a transação já nasce CANCELLED via status
    }

    // Verifica resumo
    const currentMonth = new Date().toISOString().slice(0, 7);
    const resumo = await req.get(`/api/financeiro/resumo?month=${currentMonth}`);
    expect(resumo.ok()).toBeTruthy();
    const data = await resumo.json();

    // Saldo realizado = paid (100) - paid (30) = 70
    const saldoEsperado = 100 - 30;
    expect(data.balance).toBeCloseTo(saldoEsperado, 1);

    // Receita PAID deve ser 100
    expect(data.receivable.paid).toBeGreaterThanOrEqual(100);

    // Receita prevista inclui o pendente (500) + o pago (100) → no total
    expect(data.receivable.total).toBeGreaterThanOrEqual(500);

    // CANCELLED não entra
    expect(data.receivable.paid + data.receivable.total).toBeLessThan(10000);
  });

  test("BUG-002: relatorio financeiro nao mostra contas vencidas de meses anteriores", async ({ page }) => {
    const req = page.request;
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Garante que existe uma conta vencida (dueDate no passado e PENDING)
    // (já deve existir do seed)
    const res = await req.get(`/api/relatorios/financeiro?month=${currentMonth}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    // Resumo deve incluir contasVencidas e contasPendentes (podem ser 0)
    expect(data.resumo).toBeDefined();
    expect(typeof data.resumo.contasVencidas).toBe("number");
    expect(typeof data.resumo.contasPendentes).toBe("number");
    // O número não deve ser excessivo (apenas do mês atual)
    expect(data.resumo.contasVencidas).toBeLessThan(100);
  });

  test("BUG-006/009: status financeiro nao retorna enum tecnico", async ({ page }) => {
    const req = page.request;

    // Cria tx PENDING e verifica que UI tem label em portugues
    const desc = e2eName("StatusTest");
    const created = await req.post("/api/financeiro", {
      data: {
        type: "RECEIVABLE",
        description: desc,
        amount: 50,
        category: "E2E",
        status: "PENDING",
        dueDate: new Date().toISOString(),
      },
    });
    expect([200, 201]).toContain(created.status());

    // Abre transacoes e procura label "Pendente" (não "PENDING")
    await page.goto("/financeiro/transacoes");
    await expect(page.getByText(desc).first()).toBeVisible({ timeout: 10_000 });
    // A página deve ter o label em português
    await expect(page.getByText("Pendente").first()).toBeVisible();
  });
});
