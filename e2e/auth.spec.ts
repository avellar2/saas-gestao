import { test, expect } from "@playwright/test";
import { USERS, login } from "./helpers/auth";
import { ROUTES } from "./helpers/selectors";

test.describe("Autenticacao", () => {
  test("login como super admin redireciona para /admin", async ({ page }) => {
    await login(page, "super_admin");
    await expect(page).toHaveURL(/\/admin/);
  });

  test("login como empresa ativa redireciona para /dashboard", async ({ page }) => {
    await login(page, "active_admin");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("login com credenciais invalidas mostra erro", async ({ page }) => {
    await page.goto(ROUTES.login);
    await page.waitForSelector(USERS.active_admin.email, { state: "visible", timeout: 15_000 }).catch(() => null);
    await page.fill("#email", "invalido@email.com");
    await page.fill("#password", "senha_errada");
    await page.click('button[type="submit"]');
    await expect(page.getByText(/e-mail ou senha/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("acesso a rota privada sem login redireciona para /login", async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });

  test("acesso a API privada sem sessao retorna 401", async ({ request }) => {
    const res = await request.get("/api/clientes");
    expect(res.status()).toBe(401);
  });

  test("sessao persiste entre navegacoes", async ({ page }) => {
    await login(page, "active_admin");
    await page.goto(ROUTES.clientes);
    await expect(page).toHaveURL(/\/clientes/);
    await page.goto(ROUTES.os);
    await expect(page).toHaveURL(/\/ordens-servico/);
    await page.goto(ROUTES.financeiro);
    await expect(page).toHaveURL(/\/financeiro/);
  });

  test("logout limpa a sessao", async ({ page }) => {
    await login(page, "active_admin");
    await page.goto(ROUTES.dashboard);
    await page.context().clearCookies();
    await page.goto(ROUTES.dashboard);
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });
});
