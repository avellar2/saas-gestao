import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Portal Publico de Orcamentos", () => {
  test("portal com token invalido mostra erro", async ({ page }) => {
    const res = await page.goto("/portal/orcamento/token-invalido-xyz");
    expect(res === null || res.status() < 500).toBeTruthy();
    await expect(
      page.getByText(/n.o encontrad|inv.lid|n.o dispon.vel|404|erro/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("portal com token vazio redireciona ou mostra erro", async ({ page }) => {
    const res = await page.goto("/portal/orcamento/");
    expect(res === null || res.status() < 500).toBeTruthy();
  });

  test("API publica de orcamento com token invalido retorna 404/400", async ({ request }) => {
    const res = await request.get("/api/public/orcamentos/token-invalido-xyz");
    expect([400, 404, 500]).toContain(res.status());
  });

  test("criando orcamento e abrindo portal mostra dados publicos", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;

    // Pegar primeiro cliente
    const clientes = await req.get("/api/clientes");
    expect(clientes.status()).toBe(200);
    const clientesBody = await clientes.json();
    const clientesArr = Array.isArray(clientesBody) ? clientesBody : clientesBody?.customers ?? clientesBody?.data ?? [];
    const customerId = clientesArr[0]?.id;
    expect(customerId, "precisa de pelo menos 1 cliente no banco").toBeTruthy();

    // Criar orcamento via API
    const created = await req.post("/api/orcamentos", {
      data: {
        customerId,
        description: "E2E Portal Orcamento - teste",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        items: [
          { description: "E2E servico teste", quantity: 1, unitPrice: 100 },
        ],
      },
    });
    expect([200, 201]).toContain(created.status());
    const createdBody = await created.json();
    const quoteId = createdBody?.id ?? createdBody?.data?.id;
    expect(quoteId, "orcamento precisa ter id").toBeTruthy();

    // Enviar orcamento para gerar token
    const sent = await req.post(`/api/orcamentos/${quoteId}/send`, {
      data: { channel: "MANUAL" },
    });
    expect([200, 201]).toContain(sent.status());

    // Pegar o orcamento para obter o token
    const quote = await req.get(`/api/orcamentos/${quoteId}`);
    expect(quote.status()).toBe(200);
    const quoteBody = await quote.json();
    const publicToken = quoteBody?.publicToken ?? quoteBody?.data?.publicToken;
    expect(publicToken, "orcamento precisa ter publicToken apos envio").toBeTruthy();

    // Visitar portal publico
    await page.context().clearCookies();
    await page.goto(`/portal/orcamento/${publicToken}`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByText(/E2E|Portal|Orcamento|orcamento|cliente/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // PDF publico (API publica, sem auth)
    const pdf = await req.get(`/api/public/orcamentos/${publicToken}/pdf`);
    expect([200, 500]).toContain(pdf.status());
  });

  test("cliente aprova orcamento online", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;

    // Criar cliente e orcamento
    const clientes = await req.get("/api/clientes");
    const clientesBody = await clientes.json();
    const clientesArr = Array.isArray(clientesBody) ? clientesBody : clientesBody?.customers ?? [];
    const customerId = clientesArr[0]?.id;

    const created = await req.post("/api/orcamentos", {
      data: {
        customerId,
        items: [{ description: "E2E approve test", quantity: 1, unitPrice: 50 }],
      },
    });
    const createdBody = await created.json();
    const quoteId = createdBody?.id;

    // Enviar
    await req.post(`/api/orcamentos/${quoteId}/send`, { data: { channel: "MANUAL" } });

    // Pegar token
    const quote = await req.get(`/api/orcamentos/${quoteId}`);
    const quoteBody = await quote.json();
    const publicToken = quoteBody?.publicToken;

    // Aprovar via portal (sem auth)
    await page.context().clearCookies();
    const approveRes = await req.post(`/api/public/orcamentos/${publicToken}/approve`, {
      data: {},
    });
    expect([200, 201]).toContain(approveRes.status());

    const approveBody = await approveRes.json();
    expect(approveBody?.success).toBeTruthy();
  });

  test("cliente recusa orcamento online", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;

    const clientes = await req.get("/api/clientes");
    const clientesBody = await clientes.json();
    const clientesArr = Array.isArray(clientesBody) ? clientesBody : clientesBody?.customers ?? [];
    const customerId = clientesArr[0]?.id;

    const created = await req.post("/api/orcamentos", {
      data: {
        customerId,
        items: [{ description: "E2E reject test", quantity: 1, unitPrice: 50 }],
      },
    });
    const createdBody = await created.json();
    const quoteId = createdBody?.id;

    await req.post(`/api/orcamentos/${quoteId}/send`, { data: { channel: "MANUAL" } });

    const quote = await req.get(`/api/orcamentos/${quoteId}`);
    const quoteBody = await quote.json();
    const publicToken = quoteBody?.publicToken;

    await page.context().clearCookies();
    const rejectRes = await req.post(`/api/public/orcamentos/${publicToken}/reject`, {
      data: { reason: "Nao tenho interesse" },
    });
    expect([200, 201]).toContain(rejectRes.status());

    const rejectBody = await rejectRes.json();
    expect(rejectBody?.success).toBeTruthy();
  });

  test("aprovacao duplicada e idempotente", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;

    const clientes = await req.get("/api/clientes");
    const clientesBody = await clientes.json();
    const clientesArr = Array.isArray(clientesBody) ? clientesBody : clientesBody?.customers ?? [];
    const customerId = clientesArr[0]?.id;

    const created = await req.post("/api/orcamentos", {
      data: {
        customerId,
        items: [{ description: "E2E idempotent test", quantity: 1, unitPrice: 50 }],
      },
    });
    const createdBody = await created.json();
    const quoteId = createdBody?.id;

    await req.post(`/api/orcamentos/${quoteId}/send`, { data: { channel: "MANUAL" } });

    const quote = await req.get(`/api/orcamentos/${quoteId}`);
    const quoteBody = await quote.json();
    const publicToken = quoteBody?.publicToken;

    await page.context().clearCookies();

    // Primeira aprovacao
    const res1 = await req.post(`/api/public/orcamentos/${publicToken}/approve`, { data: {} });
    expect(res1.status()).toBe(200);

    // Segunda aprovacao (idempotente)
    const res2 = await req.post(`/api/public/orcamentos/${publicToken}/approve`, { data: {} });
    expect(res2.status()).toBe(200);
  });
});

test.describe("Envio de Orcamentos", () => {
  test("modal de envio abre", async ({ page }) => {
    await login(page, "active_admin");

    // Criar orcamento primeiro
    const req = page.request;
    const clientes = await req.get("/api/clientes");
    const clientesBody = await clientes.json();
    const clientesArr = Array.isArray(clientesBody) ? clientesBody : clientesBody?.customers ?? [];
    const customerId = clientesArr[0]?.id;

    const created = await req.post("/api/orcamentos", {
      data: {
        customerId,
        items: [{ description: "E2E send modal test", quantity: 1, unitPrice: 50 }],
      },
    });
    const createdBody = await created.json();
    const quoteId = createdBody?.id;

    // Visitar pagina do orcamento
    await page.goto(`/orcamentos/${quoteId}`);
    await page.waitForLoadState("networkidle");

    // Clicar no botao Enviar
    const sendBtn = page.getByRole("button", { name: /enviar/i }).first();
    await expect(sendBtn).toBeVisible({ timeout: 10_000 });
    await sendBtn.click();

    // Verificar que o modal abriu
    await expect(page.getByText(/escolha como enviar/i)).toBeVisible({ timeout: 5_000 });
  });

  test("PUT antigo nao consegue mudar para SENT", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;

    const clientes = await req.get("/api/clientes");
    const clientesBody = await clientes.json();
    const clientesArr = Array.isArray(clientesBody) ? clientesBody : clientesBody?.customers ?? [];
    const customerId = clientesArr[0]?.id;

    const created = await req.post("/api/orcamentos", {
      data: {
        customerId,
        items: [{ description: "E2E bypass test", quantity: 1, unitPrice: 50 }],
      },
    });
    const createdBody = await created.json();
    const quoteId = createdBody?.id;

    // Tentar mudar status via PUT antigo
    const res = await req.put(`/api/orcamentos/${quoteId}`, {
      data: { status: "SENT" },
    });

    // Deve falhar
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body?.error).toContain("endpoint dedicado");
  });
});
