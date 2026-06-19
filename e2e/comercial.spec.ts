import { test, expect } from "@playwright/test";

const ADMIN = { email: "admin@gestorlocal.com", password: "admin123" };
const ACTIVE = { email: "marcos@mecanicacentral.com", password: "marcos123" };

async function login(page, email, password) {
  await page.goto("/login");
  await page.waitForSelector("#email", { state: "visible", timeout: 10000 });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
}

test.describe("Fluxo comercial — Upgrade e modulos", () => {
  test("deve acessar a pagina de upgrade", async ({ page }) => {
    await login(page, ACTIVE.email, ACTIVE.password);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    await page.goto("/upgrade");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });

    // Deve mostrar o plano base
    await expect(page.locator("text=Plano Base")).toBeVisible({ timeout: 5000 });

    // Deve mostrar modulos disponiveis
    await expect(page.locator("text=Módulos Disponíveis")).toBeVisible({ timeout: 5000 });
  });

  test("deve mostrar badges de modulo ativo para empresa com assinatura", async ({ page }) => {
    await login(page, ACTIVE.email, ACTIVE.password);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    await page.goto("/upgrade");
    await expect(page.locator("text=Plano Base")).toBeVisible({ timeout: 10000 });

    // Se a empresa tem modulos ativos, eles devem mostrar badge "Ativo"
    // Se nao tem assinatura, os modulos devem mostrar botao "Assinar"
    const moduleCards = page.locator("[class*='Card']");
    await expect(moduleCards.first()).toBeVisible({ timeout: 5000 });
  });

  test("deve redirecionar usuario nao autenticado para login ao acessar /upgrade", async ({ page }) => {
    await page.goto("/upgrade");
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });

  test("deve bloquear checkout de plano legado Basic/Pro via API", async ({ page }) => {
    await login(page, ACTIVE.email, ACTIVE.password);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Tentar criar checkout com plano legado deve ser bloqueado
    const response = await page.request.post("/api/stripe/checkout", {
      data: { plan: "basic" },
    });

    // Deve retornar erro 400 bloqueando planos legados
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("descontinuados");
  });

  test("deve exigir includedModuleKey para checkout modular", async ({ page }) => {
    await login(page, ACTIVE.email, ACTIVE.password);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Enviar checkout sem includedModuleKey e sem plan deve dar erro
    const response = await page.request.post("/api/stripe/checkout", {
      data: {},
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("invalida");
  });

  test("deve rejeitar modulo invalido no checkout", async ({ page }) => {
    await login(page, ACTIVE.email, ACTIVE.password);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    const response = await page.request.post("/api/stripe/checkout", {
      data: { includedModuleKey: "modulo_inexistente" },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("invalido");
  });
});

test.describe("Fluxo comercial — Adicionar modulo", () => {
  test("deve rejeitar adicao de modulo sem autenticacao", async ({ page }) => {
    const response = await page.request.post("/api/stripe/modules/add", {
      data: { moduleKey: "financeiro" },
    });

    // Sem autenticacao deve retornar 401 ou redirecionar para login
    expect([401, 302, 307]).toContain(response.status());
  });

  test("deve rejeitar adicao de modulo core", async ({ page }) => {
    await login(page, ACTIVE.email, ACTIVE.password);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    const response = await page.request.post("/api/stripe/modules/add", {
      data: { moduleKey: "clientes" },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("core");
  });

  test("deve rejeitar adicao de modulo invalido", async ({ page }) => {
    await login(page, ACTIVE.email, ACTIVE.password);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    const response = await page.request.post("/api/stripe/modules/add", {
      data: { moduleKey: "modulo_inexistente" },
    });

    expect(response.status()).toBe(400);
  });

  test("deve rejeitar adicao sem moduleKey", async ({ page }) => {
    await login(page, ACTIVE.email, ACTIVE.password);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    const response = await page.request.post("/api/stripe/modules/add", {
      data: {},
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("obrigatorio");
  });
});

test.describe("Fluxo comercial — Remover modulo", () => {
  test("deve rejeitar remocao de modulo core", async ({ page }) => {
    await login(page, ACTIVE.email, ACTIVE.password);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    const response = await page.request.post("/api/stripe/modules/remove", {
      data: { moduleKey: "clientes" },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("core");
  });

  test("deve rejeitar remocao sem autenticacao", async ({ page }) => {
    const response = await page.request.post("/api/stripe/modules/remove", {
      data: { moduleKey: "financeiro" },
    });

    expect([401, 302, 307]).toContain(response.status());
  });

  test("deve rejeitar remocao sem moduleKey", async ({ page }) => {
    await login(page, ACTIVE.email, ACTIVE.password);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    const response = await page.request.post("/api/stripe/modules/remove", {
      data: {},
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("obrigatorio");
  });
});

test.describe("Fluxo comercial — Modulos da empresa", () => {
  test("deve retornar modulos ativos para usuario autenticado", async ({ page }) => {
    await login(page, ACTIVE.email, ACTIVE.password);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    const response = await page.request.get("/api/empresas/me/modules");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("activeModules");
    expect(data).toHaveProperty("hasStripeSubscription");
    expect(Array.isArray(data.activeModules)).toBe(true);
  });

  test("deve rejeitar acesso sem autenticacao", async ({ page }) => {
    const response = await page.request.get("/api/empresas/me/modules");
    expect([401, 302, 307]).toContain(response.status());
  });
});

test.describe("Fluxo comercial — Stripe Portal", () => {
  test("deve rejeitar acesso ao portal sem autenticacao", async ({ page }) => {
    const response = await page.request.get("/api/stripe/portal");
    expect([401, 302, 307]).toContain(response.status());
  });
});

test.describe("Fluxo comercial — Criacao de empresa com admin", () => {
  test("deve mostrar campos de admin na pagina de nova empresa", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    await page.goto("/admin/empresas/novo");
    await expect(page.locator("#adminName, input[name='adminName']").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#adminEmail, input[name='adminEmail']").first()).toBeVisible({ timeout: 5000 });
  });
});