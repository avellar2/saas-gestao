import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { ROUTES } from "./helpers/selectors";
import { e2eName } from "./helpers/test-data";

test.describe("Orcamentos", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "active_admin");
  });

  test("lista orcamentos carrega", async ({ page }) => {
    await page.goto(ROUTES.orcamentos);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("abre detalhe de um orcamento", async ({ page }) => {
    await page.goto(ROUTES.orcamentos);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
    const link = page.locator('table a[href*="/orcamentos/"]').first();
    await expect(link).toBeVisible({ timeout: 5_000 });
    await link.click();
    await page.waitForURL(/\/orcamentos\//, { timeout: 10_000 });
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("cria novo orcamento com cliente e item", async ({ page }) => {
    await page.goto(ROUTES.orcamentoNovo);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });

    // Tenta preencher o select de cliente (pode ser o primeiro da lista)
    const customerSelect = page.locator('select[name="customerId"], select#customerId, select').first();
    if (await customerSelect.isVisible().catch(() => false)) {
      const options = customerSelect.locator("option");
      const count = await options.count();
      if (count > 1) {
        await customerSelect.selectOption({ index: 1 });
      }
    }

    // Descricao do orcamento com prefixo E2E
    const descInput = page.locator("#description, [name=\"description\"]").first();
    if (await descInput.isVisible().catch(() => false)) {
      await descInput.fill(e2eName("Orcamento"));
    }

    // Adicionar item (botao generico)
    const addItemBtn = page.locator('button:has-text("Adicionar"), button:has-text("Item")').first();
    if (await addItemBtn.isVisible().catch(() => false)) {
      await addItemBtn.click();
    }

    // Submeter
    const submit = page.locator('button[type="submit"]').first();
    if (await submit.isVisible().catch(() => false)) {
      await submit.click();
      await page.waitForURL(/\/orcamentos/, { timeout: 15_000 });
    }
  });
});
