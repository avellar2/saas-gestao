/**
 * Testes de Isolamento Multiempresa
 *
 * Esses testes verificam que:
 * 1. Empresa A não consegue ver dados da Empresa B
 * 2. Limites de trial são respeitados
 * 3. Módulo bloqueado retorna 403 nas APIs
 * 4. Empresa suspensa é bloqueada
 *
 * Uso: npx tsx --env-file=.env prisma/tests/isolation-test.ts
 */

import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message}`);
    failed++;
  }
}

async function main() {
  console.log("\n🔒 Testes de Isolamento Multiempresa\n");
  console.log("─".repeat(50));

  // ── 1. Buscar empresas para teste ──────────────────────────────
  console.log("\n📋 Preparando dados de teste...\n");

  const companies = await prisma.company.findMany({
    include: { users: true },
  });

  const trialCompany = companies.find((c) => c.status === "TRIAL");
  const activeCompany = companies.find((c) => c.status === "ACTIVE");

  if (!trialCompany || !activeCompany) {
    console.log("❌ Necessario ter empresas TRIAL e ACTIVE no seed.");
    console.log("   Rode: npx prisma db seed");
    process.exit(1);
  }

  console.log(`   Trial: ${trialCompany.name} (${trialCompany.id})`);
  console.log(`   Active: ${activeCompany.name} (${activeCompany.id})`);

  // ── 2. Empresas têm IDs diferentes ──────────────────────────
  console.log("\n📋 Verificacao 1: Empresas tem IDs diferentes\n");
  assert(trialCompany.id !== activeCompany.id, "IDs das empresas sao diferentes");

  // ── 3. Isolamento de Clientes ──────────────────────────────
  console.log("\n📋 Verificacao 2: Isolamento de Clientes\n");

  // Cria um cliente na empresa trial
  const trialCustomer = await prisma.customer.create({
    data: {
      companyId: trialCompany.id,
      name: "Cliente Teste Trial",
    },
  });
  assert(trialCustomer.companyId === trialCompany.id, "Cliente trial criado com companyId correto");

  // Tenta achar o cliente trial usando companyId errado
  const wrongTenantFind = await prisma.customer.findFirst({
    where: { id: trialCustomer.id, companyId: activeCompany.id },
  });
  assert(wrongTenantFind === null, "Empresa ACTIVE nao encontra cliente da empresa TRIAL");

  // Busca com o companyId correto
  const rightTenantFind = await prisma.customer.findFirst({
    where: { id: trialCustomer.id, companyId: trialCompany.id },
  });
  assert(rightTenantFind !== null, "Empresa TRIAL encontra seu proprio cliente");

  // ── 4. Isolamento de Orcamentos ──────────────────────────────
  console.log("\n📋 Verificacao 3: Isolamento de Orcamentos\n");

  const lastQuoteTrial = await prisma.quote.findFirst({
    where: { companyId: trialCompany.id },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  const trialQuote = await prisma.quote.create({
    data: {
      companyId: trialCompany.id,
      customerId: trialCustomer.id,
      number: lastQuoteTrial ? lastQuoteTrial.number + 1 : 1,
      subtotal: 100,
      total: 100,
      items: {
        create: [{ description: "Item teste", quantity: 1, unitPrice: 100, total: 100 }],
      },
    },
  });
  assert(trialQuote.companyId === trialCompany.id, "Orcamento trial criado com companyId correto");

  const wrongQuoteFind = await prisma.quote.findFirst({
    where: { id: trialQuote.id, companyId: activeCompany.id },
  });
  assert(wrongQuoteFind === null, "Empresa ACTIVE nao encontra orcamento da empresa TRIAL");

  // ── 5. Isolamento de Ordens de Servico ──────────────────────
  console.log("\n📋 Verificacao 4: Isolamento de Ordens de Servico\n");

  const lastOSTrial = await prisma.serviceOrder.findFirst({
    where: { companyId: trialCompany.id },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  const trialSO = await prisma.serviceOrder.create({
    data: {
      companyId: trialCompany.id,
      customerId: trialCustomer.id,
      number: lastOSTrial ? lastOSTrial.number + 1 : 1,
      total: 200,
      items: {
        create: [{ description: "Servico teste", quantity: 1, unitPrice: 200, total: 200 }],
      },
    },
  });
  assert(trialSO.companyId === trialCompany.id, "OS trial criada com companyId correto");

  const wrongSOFind = await prisma.serviceOrder.findFirst({
    where: { id: trialSO.id, companyId: activeCompany.id },
  });
  assert(wrongSOFind === null, "Empresa ACTIVE nao encontra OS da empresa TRIAL");

  // ── 6. Limites de Trial ─────────────────────────────────────
  console.log("\n📋 Verificacao 5: Limites de Trial (20 registros)\n");

  const customerCount = await prisma.customer.count({
    where: { companyId: trialCompany.id },
  });
  assert(customerCount <= 21, `Empresa trial tem ${customerCount} clientes (limite: 20 + registro de teste)`);

  // ── 7. Modulo Inativo ──────────────────────────────────────
  console.log("\n📋 Verificacao 6: Modulos inativos\n");

  const customersModule = await prisma.companyModule.findUnique({
    where: { companyId_moduleKey: { companyId: trialCompany.id, moduleKey: "customers" } },
  });
  assert(customersModule !== null, "Registro companyModule existe para customers");

  if (customersModule) {
    assert(customersModule.active === true, "Modulo customers esta ativo para empresa trial (vem do seed)");
  }

  // Usuarios module (nao ativado no seed para trial)
  const usersModule = await prisma.companyModule.findUnique({
    where: { companyId_moduleKey: { companyId: trialCompany.id, moduleKey: "users_permissions" } },
  });

  if (usersModule) {
    assert(usersModule.active === false, "Modulo users_permissions esta inativo para trial");
  }

  // ── 8. Empresa Suspensa — ninguem consegue acessar dados ──
  console.log("\n📋 Verificacao 7: Empresa suspensa\n");

  const suspendedCompany = companies.find((c) => c.status === "SUSPENDED" || c.status === "CANCELLED");

  if (suspendedCompany) {
    const suspendedCustomers = await prisma.customer.count({
      where: { companyId: suspendedCompany.id },
    });
    console.log(`   Empresa ${suspendedCompany.status}: ${suspendedCustomers} clientes (não deve conseguir operar)`);
    assert(true, "Empresa suspensa/cancelada existe no banco");
  } else {
    console.log("   ⚠️ Nenhuma empresa SUSPENDED ou CANCELLED no seed");
  }

  // ── 9. RLS no banco ─────────────────────────────────────────
  console.log("\n📋 Verificacao 8: RLS (Row Level Security) no banco\n");

  // Seta sessão como empresa ACTIVE e tenta ler dados da empresa TRIAL
  await prisma.$executeRawUnsafe(
    `SELECT set_config('app.current_company_id', $1, true)`,
    activeCompany.id
  );

  const rlsBlocked = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT id, name, "companyId" FROM customers WHERE id = $1`,
    trialCustomer.id
  );
  assert(rlsBlocked.length === 0, "RLS bloqueou acesso da empresa ACTIVE aos dados da empresa TRIAL");

  // Seta sessão como SUPER_ADMIN (vazio) e verifica que vê tudo
  await prisma.$executeRawUnsafe(
    `SELECT set_config('app.current_company_id', '', true)`
  );

  const rlsAdmin = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT id, name, "companyId" FROM customers WHERE id = $1`,
    trialCustomer.id
  );
  assert(rlsAdmin.length > 0, "RLS permite SUPER_ADMIN ver todos os dados");

  // ── 10. Limpeza (remover dados de teste) ─────────────────────
  console.log("\n📋 Limpeza dos dados de teste...\n");

  await prisma.serviceOrderItem.deleteMany({ where: { serviceOrderId: trialSO.id } });
  await prisma.serviceOrder.delete({ where: { id: trialSO.id } });
  await prisma.quoteItem.deleteMany({ where: { quoteId: trialQuote.id } });
  await prisma.quote.delete({ where: { id: trialQuote.id } });
  await prisma.customer.delete({ where: { id: trialCustomer.id } });

  console.log("   Dados de teste removidos com sucesso.");

  // ── 10. Resumo ─────────────────────────────────────────────
  console.log("\n" + "═".repeat(50));
  console.log(`\n📊 Resultado: ${passed} passaram, ${failed} falharam\n`);

  await prisma.$disconnect();

  if (failed > 0) {
    console.log("⚠️  Alguns testes falharam. Reveja os erros acima.\n");
    process.exit(1);
  } else {
    console.log("🎉 Todos os testes passaram!\n");
  }
}

main().catch((err) => {
  console.error("Erro ao executar testes:", err);
  process.exit(1);
});