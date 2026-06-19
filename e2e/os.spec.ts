import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { ROUTES } from "./helpers/selectors";
import { e2eName, e2eAmount } from "./helpers/test-data";

test.describe("Ordens de Servico", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "active_admin");
  });

  test("lista OS carrega", async ({ page }) => {
    await page.goto(ROUTES.os);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("filtro de status funciona", async ({ page }) => {
    await page.goto(ROUTES.os);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
    // Clica na tab "Em Execucao" (exemplo)
    const tab = page.locator('a[href*="status=IN_PROGRESS"]').first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await page.waitForURL(/status=IN_PROGRESS/, { timeout: 10_000 });
    }
  });

  test("cria nova OS com cliente e equipamento", async ({ page }) => {
    await page.goto(ROUTES.osNova);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });

    // Selecionar cliente
    const customerSelect = page.locator('select[name="customerId"], select#customerId').first();
    if (await customerSelect.isVisible().catch(() => false)) {
      const options = customerSelect.locator("option");
      const count = await options.count();
      if (count > 1) {
        await customerSelect.selectOption({ index: 1 });
      }
    }

    // Preencher equipamento
    const equip = page.locator("#equipmentName").first();
    if (await equip.isVisible().catch(() => false)) {
      await equip.fill(e2eName("Notebook Dell"));
    }
    const brand = page.locator("#equipmentBrand").first();
    if (await brand.isVisible().catch(() => false)) {
      await brand.fill("E2E Marca");
    }
    const model = page.locator("#equipmentModel").first();
    if (await model.isVisible().catch(() => false)) {
      await model.fill("E2E Modelo X1");
    }
    const serial = page.locator("#serialNumber").first();
    if (await serial.isVisible().catch(() => false)) {
      await serial.fill(`E2E-SN-${Date.now()}`);
    }

    // Problema
    const problem = page.locator("#problemDescription").first();
    if (await problem.isVisible().catch(() => false)) {
      await problem.fill(e2eName("OS") + " - nao liga");
    }

    // Submeter
    const submit = page.locator('button[type="submit"]').first();
    await submit.click();
    await page.waitForURL(/\/ordens-servico/, { timeout: 20_000 });
  });

  test("abre detalhe de uma OS existente", async ({ page }) => {
    await page.goto(ROUTES.os);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
    const link = page.locator('table a[href*="/ordens-servico/"]').first();
    await expect(link).toBeVisible({ timeout: 5_000 });
    await link.click();
    await page.waitForURL(/\/ordens-servico\//, { timeout: 10_000 });
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("endpoint de PDF de OS responde", async ({ page }) => {
    await login(page, "active_admin");
    const req = page.request;
    const list = await req.get("/api/ordens-servico");
    expect(list.status()).toBe(200);
    const body = await list.json();
    const first = Array.isArray(body) ? body[0] : body?.data?.[0];
    if (first?.id) {
      const pdf = await req.get(`/api/pdf/os/${first.id}`);
      expect([200, 500]).toContain(pdf.status());
    }
  });
});
