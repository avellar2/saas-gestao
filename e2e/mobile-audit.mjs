// Mobile audit script — captures screenshots at multiple viewports
// Run: node e2e/mobile-audit.mjs

import { chromium } from "playwright";

const VIEWPORTS = [
  { name: "mobile-S", width: 360, height: 800 },
  { name: "mobile-M", width: 390, height: 844 },
  { name: "mobile-L", width: 412, height: 915 },
  { name: "tablet", width: 768, height: 1024 },
];

const PAGES = [
  { path: "/login", name: "login", desc: "Página de login" },
  { path: "/dashboard", name: "dashboard", desc: "Dashboard principal", needsAuth: true },
  { path: "/clientes", name: "clientes", desc: "Lista de clientes", needsAuth: true },
  { path: "/orcamentos", name: "orcamentos", desc: "Lista de orçamentos", needsAuth: true },
  { path: "/ordens-servico", name: "os", desc: "Ordens de serviço", needsAuth: true },
  { path: "/financeiro", name: "financeiro", desc: "Financeiro", needsAuth: true },
  { path: "/financeiro/receber", name: "financeiro-receber", desc: "Contas a receber", needsAuth: true },
  { path: "/financeiro/pagar", name: "financeiro-pagar", desc: "Contas a pagar", needsAuth: true },
  { path: "/financeiro/transacoes", name: "financeiro-transacoes", desc: "Transações", needsAuth: true },
  { path: "/estoque", name: "estoque", desc: "Estoque", needsAuth: true },
  { path: "/agendamento", name: "agendamento", desc: "Agendamento", needsAuth: true },
  { path: "/cardapio", name: "cardapio", desc: "Cardápio Digital", needsAuth: true },
  { path: "/relatorios", name: "relatorios", desc: "Relatórios", needsAuth: true },
  { path: "/relatorios/executivo", name: "relatorios-executivo", desc: "Dashboard executivo", needsAuth: true },
  { path: "/usuarios", name: "usuarios", desc: "Usuários", needsAuth: true },
  { path: "/upgrade", name: "upgrade", desc: "Upgrade de plano", needsAuth: true },
  { path: "/admin/empresas", name: "admin-empresas", desc: "Admin - Empresas", needsAuth: true, adminOnly: true },
  { path: "/admin/empresas/novo", name: "admin-empresas-novo", desc: "Admin - Nova empresa", needsAuth: true, adminOnly: true },
  { path: "/forgot-password", name: "forgot-password", desc: "Esqueceu senha" },
  { path: "/portal/os/test-token", name: "portal-os", desc: "Portal OS (público)" },
  { path: "/cardapio/public/test", name: "cardapio-publico", desc: "Cardápio público" },
];

const BASE_URL = "http://localhost:3000";
const ADMIN = { email: "admin@gestorlocal.com", password: "admin123" };
const ACTIVE = { email: "marcos@mecanicacentral.com", password: "marcos123" };

async function run() {
  const browser = await chromium.launch();
  const results = [];

  for (const viewport of VIEWPORTS) {
    console.log(`\n📱 Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);

    for (const page of PAGES) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      });
      const p = await context.newPage();

      try {
        // Login if needed
        if (page.needsAuth) {
          const cred = page.adminOnly ? ADMIN : ACTIVE;
          await p.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 15000 });
          await p.waitForSelector("#email", { timeout: 10000 });
          await p.fill("#email", cred.email);
          await p.fill("#password", cred.password);
          await p.click("button[type=submit]");

          if (page.adminOnly) {
            await p.waitForURL(/\/admin/, { timeout: 20000 });
          } else {
            await p.waitForURL(/\/(dashboard|admin)/, { timeout: 20000 });
          }
        }

        // Navigate to the page
        await p.goto(`${BASE_URL}${page.path}`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});

        // Wait a moment for animations
        await p.waitForTimeout(1000);

        // Check for horizontal overflow
        const scrollWidth = await p.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await p.evaluate(() => document.documentElement.clientWidth);
        const hasHorizontalOverflow = scrollWidth > clientWidth;

        // Check for visible content
        const bodyText = await p.evaluate(() => document.body?.innerText?.substring(0, 200) || "");
        const hasContent = bodyText.length > 10;

        // Take screenshot
        const screenshotDir = `screenshots/${viewport.name}`;
        const screenshotPath = `${screenshotDir}/${page.name}.png`;

        // Create dir if needed (Node.js 18+)
        const fs = await import("fs/promises");
        await fs.mkdir(screenshotDir, { recursive: true });
        await p.screenshot({ path: screenshotPath, fullPage: false });

        // Check for common mobile issues
        const issues = [];
        if (hasHorizontalOverflow) {
          issues.push(`overflow-horizontal: scrollWidth=${scrollWidth} clientWidth=${clientWidth} diff=${scrollWidth - clientWidth}px`);
        }
        if (!hasContent && page.path !== "/portal/os/test-token" && page.path !== "/cardapio/public/test") {
          issues.push("no-visible-content");
        }

        // Check buttons visibility
        const buttons = await p.locator("button:visible").count();
        const links = await p.locator("a:visible").count();

        results.push({
          viewport: viewport.name,
          width: viewport.width,
          height: viewport.height,
          page: page.name,
          path: page.path,
          desc: page.desc,
          screenshotPath,
          hasHorizontalOverflow,
          issues,
          buttons,
          links,
          contentLength: bodyText.length,
        });

        console.log(`  ✅ ${page.name}: ${issues.length > 0 ? "⚠️ " + issues.join(", ") : "OK"}`);

      } catch (err) {
        console.log(`  ❌ ${page.name}: ${err.message?.substring(0, 100)}`);
        results.push({
          viewport: viewport.name,
          width: viewport.width,
          height: viewport.height,
          page: page.name,
          path: page.path,
          desc: page.desc,
          screenshotPath: null,
          hasHorizontalOverflow: false,
          issues: ["error: " + (err.message?.substring(0, 100) || "unknown")],
          buttons: 0,
          links: 0,
          contentLength: 0,
        });
      }

      await context.close();
    }
  }

  await browser.close();

  // Write results as JSON for the audit doc
  const fs = await import("fs/promises");
  await fs.writeFile("screenshots/mobile-audit-results.json", JSON.stringify(results, null, 2));

  // Summary
  const withIssues = results.filter(r => r.issues.length > 0);
  const overflowIssues = results.filter(r => r.hasHorizontalOverflow);
  console.log(`\n📊 Resumo:`);
  console.log(`   Total de screenshots: ${results.filter(r => r.screenshotPath).length}`);
  console.log(`   Páginas com problemas: ${withIssues.length}`);
  console.log(`   Páginas com overflow horizontal: ${overflowIssues.length}`);
  console.log(`\n   Problemas por viewport:`);
  for (const vp of VIEWPORTS) {
    const vpResults = results.filter(r => r.viewport === vp.name);
    const vpIssues = vpResults.filter(r => r.issues.length > 0);
    console.log(`   ${vp.name} (${vp.width}x${vp.height}): ${vpIssues.length}/${vpResults.length} com problemas`);
  }
}

run().catch(console.error);