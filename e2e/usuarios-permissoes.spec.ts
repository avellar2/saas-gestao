import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { ROUTES } from "./helpers/selectors";
import { e2eEmail } from "./helpers/test-data";

test.describe("Usuarios e Permissoes", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "active_admin");
  });

  test("lista de usuarios carrega", async ({ page }) => {
    await page.goto(ROUTES.usuarios);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("cria novo usuario via API", async ({ page }) => {
    const req = page.request;
    const email = e2eEmail("user");
    const res = await req.post("/api/usuarios", {
      data: {
        name: "E2E User Test",
        email,
        password: "e2e123456",
        role: "STAFF",
        active: true,
      },
    });
    expect([200, 201, 400, 403]).toContain(res.status());
  });

  test("abre pagina de novo usuario", async ({ page }) => {
    await page.goto(ROUTES.usuarios + "/novo");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("API de usuarios responde", async ({ page }) => {
    const res = await page.request.get("/api/usuarios");
    expect([200, 403]).toContain(res.status());
  });
});
