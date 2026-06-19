import { execSync } from "node:child_process";
import type { FullConfig } from "@playwright/test";

function runCleanup(label: string): void {
  try {
    const out = execSync("npx tsx e2e/scripts/cleanup-script.ts", {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf-8",
    });
    const line = out.split("\n").find((l) => l.includes("[cleanup-script]"));
    if (line) console.log(`[E2E ${label}] ${line.trim()}`);
  } catch (e: any) {
    console.error(`[E2E ${label}] cleanup falhou:`, e?.message ?? e);
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  runCleanup("global-setup");
}
