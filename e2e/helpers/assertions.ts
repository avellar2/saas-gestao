import { expect, type Page } from "@playwright/test";

export async function expectVisible(page: Page, text: string | RegExp, timeout = 10_000): Promise<void> {
  await expect(page.getByText(text).first()).toBeVisible({ timeout });
}

export async function expectUrlContains(page: Page, fragment: string | RegExp, timeout = 15_000): Promise<void> {
  if (typeof fragment === "string") {
    await page.waitForURL((url) => url.toString().includes(fragment), { timeout });
  } else {
    await page.waitForURL(fragment, { timeout });
  }
}

export async function expectNoConsoleErrors(consoleErrors: string[]): Promise<void> {
  const real = consoleErrors.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("Sentry") &&
      !e.includes("sentry") &&
      !e.includes("RateLimit") &&
      !e.includes("429")
  );
  expect(real, `Console errors found:\n${real.join("\n")}`).toHaveLength(0);
}
