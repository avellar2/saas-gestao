import type { Page, BrowserContext } from "@playwright/test";

export type UserRole = "super_admin" | "trial_admin" | "active_admin" | "active_staff";

export const USERS = {
  super_admin: { email: "admin@gestorlocal.com", password: "admin123" },
  trial_admin: { email: "silva@esilva.com", password: "silva123" },
  active_admin: { email: "marcos@mecanicacentral.com", password: "marcos123" },
  active_staff: { email: "ana@mecanicacentral.com", password: "ana123" },
} as const;

export async function login(page: Page, role: UserRole = "active_admin"): Promise<void> {
  const user = USERS[role];
  await page.goto("/login");
  await page.waitForSelector("#email", { state: "visible", timeout: 15_000 });
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.click('button[type="submit"]');
  if (role === "super_admin") {
    await page.waitForURL(/\/admin/, { timeout: 20_000 });
  } else {
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  }
}

export async function loginAs(
  context: BrowserContext,
  role: UserRole
): Promise<Page> {
  const page = await context.newPage();
  await login(page, role);
  return page;
}

export async function logout(page: Page): Promise<void> {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Sair"), button:has-text("Logout")').first();
  if (await userMenu.isVisible().catch(() => false)) {
    await userMenu.click();
    const sair = page.locator('button:has-text("Sair"), a:has-text("Sair")').first();
    if (await sair.isVisible().catch(() => false)) {
      await sair.click();
    }
  }
  await page.context().clearCookies();
}
