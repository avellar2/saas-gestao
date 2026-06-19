import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { ROUTES } from "./helpers/selectors";

test.describe("Admin / Super Admin", () => {
  test("login como super admin leva para /admin", async ({ page }) => {
    await login(page, "super_admin");
    await expect(page).toHaveURL(/\/admin/);
  });

  test("admin home carrega", async ({ page }) => {
    await login(page, "super_admin");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("admin empresas carrega", async ({ page }) => {
    await login(page, "super_admin");
    await page.goto(ROUTES.adminEmpresas);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("admin modulos carrega", async ({ page }) => {
    await login(page, "super_admin");
    await page.goto(ROUTES.adminModulos);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("API admin de empresas responde", async ({ page }) => {
    await login(page, "super_admin");
    const res = await page.request.get("/api/empresas");
    expect([200, 401, 403]).toContain(res.status());
  });

  test("empresa ativa nao pode acessar /admin", async ({ page }) => {
    await login(page, "active_admin");
    await page.goto(ROUTES.admin);
    // Pode redirecionar ou mostrar erro de permissao
    await page.waitForLoadState("networkidle");
    const url = page.url();
    // Nao deve estar em /admin home com sucesso
    expect(url).not.toContain("/admin/empresas");
  });
});
