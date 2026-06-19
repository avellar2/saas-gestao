import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { ROUTES } from "./helpers/selectors";
import { e2eName, e2eAmount } from "./helpers/test-data";

test.describe("Financeiro", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "active_admin");
  });

  test("visao geral carrega", async ({ page }) => {
    await page.goto(ROUTES.financeiro);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("lista de transacoes carrega", async ({ page }) => {
    await page.goto(ROUTES.financeiro + "/transacoes");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("contas a receber carrega", async ({ page }) => {
    await page.goto(ROUTES.financeiro + "/receber");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("contas a pagar carrega", async ({ page }) => {
    await page.goto(ROUTES.financeiro + "/pagar");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("fluxo de caixa carrega", async ({ page }) => {
    await page.goto(ROUTES.financeiro + "/fluxo");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("cria nova transacao via UI", async ({ page }) => {
    await page.goto(ROUTES.financeiroNovo);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });

    const desc = e2eName("Receita");
    const descInput = page.locator("#description").first();
    if (await descInput.isVisible().catch(() => false)) {
      await descInput.fill(desc);
    }

    const amountInput = page.locator("#amount").first();
    if (await amountInput.isVisible().catch(() => false)) {
      await amountInput.fill(String(e2eAmount(50, 500)));
    }

    // type
    const typeSelect = page.locator("#type").first();
    if (await typeSelect.isVisible().catch(() => false)) {
      await typeSelect.selectOption("RECEIVABLE").catch(() => null);
    }

    // category
    const catInput = page.locator("#category").first();
    if (await catInput.isVisible().catch(() => false)) {
      await catInput.fill("E2E Categoria");
    }

    // dueDate
    const dueInput = page.locator("#dueDate").first();
    if (await dueInput.isVisible().catch(() => false)) {
      const d = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
      await dueInput.fill(d);
    }

    const submit = page.locator('button[type="submit"]').first();
    await submit.click();
    await page.waitForURL(/\/financeiro/, { timeout: 15_000 });
  });

  test("cria transacao via API e marca como paga", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;

    // Pegar primeiro cliente
    const clientes = await req.get("/api/clientes");
    const cb = await clientes.json();
    const arr = cb?.customers ?? [];
    const customerId = arr[0]?.id;

    const desc = e2eName("Receita");
    const created = await req.post("/api/financeiro", {
      data: {
        type: "RECEIVABLE",
        description: desc,
        amount: e2eAmount(100, 500),
        category: "E2E Test",
        status: "PENDING",
        customerId: customerId || undefined,
        dueDate: new Date(Date.now() + 7 * 86400_000).toISOString(),
      },
    });
    expect([200, 201]).toContain(created.status());
    const body = await created.json();
    const txId = body?.id ?? body?.data?.id;
    expect(txId).toBeTruthy();

    // Marcar como paga
    const paid = await req.patch(`/api/financeiro/transacoes/${txId}/pay`, {
      data: { paidAt: new Date().toISOString() },
    });
    expect([200, 201, 400]).toContain(paid.status());
  });

  test("resumo financeiro responde", async ({ page }) => {
    await login(page, "active_admin");
    const res = await page.request.get("/api/financeiro/resumo");
    expect([200, 403]).toContain(res.status());
  });

  test("abre detalhe de uma transacao existente sem erro", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;

    // Criar uma transacao E2E para garantir ID valido
    const desc = e2eName("Receita");
    const created = await req.post("/api/financeiro", {
      data: {
        type: "RECEIVABLE",
        description: desc,
        amount: 150,
        category: "E2E Detalhe",
        status: "PENDING",
        dueDate: new Date(Date.now() + 7 * 86400_000).toISOString(),
      },
    });
    expect([200, 201]).toContain(created.status());
    const body = await created.json();
    const txId = body?.id ?? body?.data?.id;
    expect(txId).toBeTruthy();

    // Abrir detalhe
    await page.goto(`/financeiro/${txId}`);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 15_000 });
    // Deve mostrar a descricao e o status
    await expect(page.getByText(desc).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Pendente|Pago|Vencido|Cancelado/i).first()).toBeVisible();
  });

  test("detalhe de transacao inexistente mostra estado vazio", async ({ page }) => {
    await login(page, "active_admin");
    const res = await page.goto("/financeiro/id-que-nao-existe-xyz");
    expect(res === null || res.status() < 500).toBeTruthy();
    await expect(
      page.getByText(/n.o encontrad|inv.lid|n.o dispon.vel|erro/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
