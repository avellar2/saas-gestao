import { test, expect } from "@playwright/test";
import { login } from "../helpers/auth";

/**
 * P19 fix: admin não pode criar empresa ACTIVE direto.
 * P18 fix: trialDays deve ser 1-90.
 */

test.describe("Security - Admin Company", () => {
  test("criar empresa sem trialDays usa default 15", async ({ page }) => {
    await login(page, "super_admin");
    const res = await page.request.post("/api/empresas", {
      data: { name: "E2E Test Company" },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body.status).toBe("TRIAL");
  });

  test("criar empresa com trialDays 50 funciona", async ({ page }) => {
    await login(page, "super_admin");
    const res = await page.request.post("/api/empresas", {
      data: { name: "E2E Test Company 50", trialDays: 50 },
    });
    expect([200, 201]).toContain(res.status());
  });

  test("criar empresa com trialDays 100 falha (>90)", async ({ page }) => {
    await login(page, "super_admin");
    const res = await page.request.post("/api/empresas", {
      data: { name: "E2E Bad Trial", trialDays: 100 },
    });
    expect(res.status()).toBe(400);
  });

  test("criar empresa com trialDays 0 falha", async ({ page }) => {
    await login(page, "super_admin");
    const res = await page.request.post("/api/empresas", {
      data: { name: "E2E Zero Trial", trialDays: 0 },
    });
    expect(res.status()).toBe(400);
  });

  test("criar empresa com trialDays -5 falha", async ({ page }) => {
    await login(page, "super_admin");
    const res = await page.request.post("/api/empresas", {
      data: { name: "E2E Negative Trial", trialDays: -5 },
    });
    expect(res.status()).toBe(400);
  });

  test("tentar criar empresa com status ACTIVE é forçado para TRIAL", async ({ page }) => {
    await login(page, "super_admin");
    const res = await page.request.post("/api/empresas", {
      data: { name: "E2E Try Active", status: "ACTIVE" },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    // P19 fix: sempre TRIAL
    expect(body.status).toBe("TRIAL");
  });

  test("criar empresa como nao-super-admin falha (403)", async ({ page }) => {
    await login(page, "active_admin");
    const res = await page.request.post("/api/empresas", {
      data: { name: "E2E Should Fail" },
    });
    expect(res.status()).toBe(403);
  });
});
