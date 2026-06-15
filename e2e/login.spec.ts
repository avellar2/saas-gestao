import { test, expect } from "@playwright/test";

const ADMIN = { email: "admin@gestorlocal.com", password: "admin123" };
const ACTIVE = { email: "marcos@mecanicacentral.com", password: "marcos123" };

async function login(page, email, password) {
  await page.goto("/login");
  // Aguarda o formulario ficar visivel (Framer Motion animation)
  await page.waitForSelector("#email", { state: "visible", timeout: 10000 });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
}

test.describe("Login", () => {
  test("deve fazer login como super admin e redirecionar para /admin", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    // Super admin e redirecionado: /login -> /dashboard -> /admin
    await page.waitForURL(/\/admin/, { timeout: 20000 });
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("deve fazer login como empresa ativa e redirecionar para /dashboard", async ({ page }) => {
    await login(page, ACTIVE.email, ACTIVE.password);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("deve mostrar erro com credenciais invalidas", async ({ page }) => {
    await page.goto("/login");
    await page.waitForSelector("#email", { state: "visible", timeout: 10000 });
    await page.fill("#email", "invalido@email.com");
    await page.fill("#password", "senha_errada");
    await page.click("button[type=submit]");
    await expect(page.locator("text=E-mail ou senha invalidos")).toBeVisible({ timeout: 10000 });
  });

  test("deve redirecionar para /login quando nao autenticado", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });
});
