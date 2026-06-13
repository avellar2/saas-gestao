import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcryptjs from "bcryptjs";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

  // ── 1. Modules ────────────────────────────────────────────────────────
  console.log("Creating modules...");

  const moduleData = [
    { key: "customers", name: "Clientes", description: "Cadastro e gestao de clientes", basePrice: 50, sortOrder: 1 },
    { key: "quotes", name: "Orcamentos", description: "Criacao e acompanhamento de orcamentos", basePrice: 30, sortOrder: 2 },
    { key: "service_orders", name: "Ordens de Servico", description: "Gestao de ordens de servico", basePrice: 25, sortOrder: 3 },
    { key: "inventory", name: "Estoque", description: "Controle de estoque e pecas", basePrice: 20, sortOrder: 4 },
    { key: "scheduling", name: "Agendamento", description: "Agenda e agendamentos", basePrice: 20, sortOrder: 5 },
    { key: "catalog", name: "Catalogo", description: "Catalogo de produtos e servicos", basePrice: 20, sortOrder: 6 },
    { key: "menu", name: "Cardapio", description: "Cardapio digital para restaurantes", basePrice: 20, sortOrder: 7 },
    { key: "finance", name: "Financeiro", description: "Controle financeiro e fluxo de caixa", basePrice: 20, sortOrder: 8 },
    { key: "reports", name: "Relatorios", description: "Relatorios e metricas", basePrice: 20, sortOrder: 9 },
    { key: "users_permissions", name: "Usuarios e Permissoes", description: "Gestao de usuarios e permissoes", basePrice: 20, sortOrder: 10 },
  ];

  for (const mod of moduleData) {
    await prisma.module.upsert({
      where: { key: mod.key },
      update: {},
      create: {
        key: mod.key,
        name: mod.name,
        description: mod.description,
        basePrice: mod.basePrice,
        sortOrder: mod.sortOrder,
        active: true,
      },
    });
  }

  console.log("Modules created.");

  // ── 2. Super Admin Company + User ──────────────────────────────────────
  console.log("Creating super admin company...");

  const superAdminCompany = await prisma.company.upsert({
    where: { id: "super-admin" },
    update: {},
    create: {
      id: "super-admin",
      name: "Gestor Local Admin",
      status: "ACTIVE",
    },
  });

  const adminPasswordHash = await bcryptjs.hash("admin123", 10);

  await prisma.user.create({
    data: {
      email: "admin@gestorlocal.com",
      name: "Admin Gestor Local",
      passwordHash: adminPasswordHash,
      role: "SUPER_ADMIN",
      companyId: superAdminCompany.id,
      active: true,
    },
  });

  console.log("Super admin created: admin@gestorlocal.com / admin123");

  // ── 3. Trial Company ───────────────────────────────────────────────────
  console.log("Creating trial company (Eletronica Silva)...");

  const trialCompany = await prisma.company.create({
    data: {
      name: "Eletronica Silva",
      tradeName: "E-Silva",
      document: "12.345.678/0001-90",
      phone: "(11) 99999-1111",
      whatsapp: "5511999991111",
      email: "contato@esilva.com",
      address: "Rua das Flores, 123 - Sao Paulo/SP",
      status: "TRIAL",
      trialStartsAt: now,
      trialEndsAt: trialEndsAt,
    },
  });

  const silvaPasswordHash = await bcryptjs.hash("silva123", 10);

  await prisma.user.create({
    data: {
      email: "silva@esilva.com",
      name: "Sr. Silva",
      passwordHash: silvaPasswordHash,
      role: "COMPANY_ADMIN",
      companyId: trialCompany.id,
      active: true,
    },
  });

  // Trial company modules: only customers active
  await prisma.companyModule.create({
    data: {
      companyId: trialCompany.id,
      moduleKey: "customers",
      active: true,
      price: 50,
      activatedAt: now,
    },
  });

  // Trial subscription
  await prisma.subscription.create({
    data: {
      companyId: trialCompany.id,
      status: "TRIAL",
      modulesCount: 1,
      monthlyPrice: 99.0,
      trialEndsAt: trialEndsAt,
    },
  });

  // Trial company customer
  await prisma.customer.create({
    data: {
      companyId: trialCompany.id,
      name: "Ana Paula",
      phone: "(11) 97777-3333",
      email: "anapaula@email.com",
    },
  });

  console.log("Trial company created: silva@esilva.com / silva123");

  // ── 4. Active Company ──────────────────────────────────────────────────
  console.log("Creating active company (Auto Mecanica Central)...");

  const activeCompany = await prisma.company.create({
    data: {
      name: "Auto Mecanica Central",
      tradeName: "Mecanica Central",
      document: "98.765.432/0001-10",
      phone: "(11) 98888-2222",
      whatsapp: "5511988882222",
      email: "contato@mecanicacentral.com",
      address: "Av. Brasil, 456 - Sao Paulo/SP",
      status: "ACTIVE",
      monthlyPrice: 154.0,
      planName: "Profissional",
    },
  });

  const marcosPasswordHash = await bcryptjs.hash("marcos123", 10);
  const anaPasswordHash = await bcryptjs.hash("ana123", 10);

  await prisma.user.create({
    data: {
      email: "marcos@mecanicacentral.com",
      name: "Marcos Oliveira",
      passwordHash: marcosPasswordHash,
      role: "COMPANY_ADMIN",
      companyId: activeCompany.id,
      active: true,
    },
  });

  await prisma.user.create({
    data: {
      email: "ana@mecanicacentral.com",
      name: "Ana Costa",
      passwordHash: anaPasswordHash,
      role: "STAFF",
      companyId: activeCompany.id,
      active: true,
    },
  });

  // Active company modules: all 10 modules active
  const allModules = [
    { key: "customers", price: 50 },
    { key: "quotes", price: 30 },
    { key: "service_orders", price: 25 },
    { key: "inventory", price: 20 },
    { key: "scheduling", price: 20 },
    { key: "catalog", price: 20 },
    { key: "menu", price: 20 },
    { key: "finance", price: 20 },
    { key: "reports", price: 20 },
    { key: "users_permissions", price: 20 },
  ];

  for (const mod of allModules) {
    await prisma.companyModule.upsert({
      where: { companyId_moduleKey: { companyId: activeCompany.id, moduleKey: mod.key } },
      update: { active: true, price: mod.price, activatedAt: now },
      create: { companyId: activeCompany.id, moduleKey: mod.key, active: true, price: mod.price, activatedAt: now },
    });
  }

  // Active subscription
  await prisma.subscription.create({
    data: {
      companyId: activeCompany.id,
      status: "ACTIVE",
      planName: "Profissional",
      modulesCount: 10,
      monthlyPrice: 294.0,
      paymentMethod: "pix",
    },
  });

  console.log("Active company created: marcos@mecanicacentral.com / marcos123, ana@mecanicacentral.com / ana123");

  // ── 5. Sample Customers for Active Company ────────────────────────────
  console.log("Creating sample customers...");

  const customersData = [
    { name: "Carlos Santos", phone: "(11) 91234-5678", email: "carlos@email.com", document: "123.456.789-00" },
    { name: "Maria Souza", phone: "(11) 92345-6789", email: "maria@email.com", document: "234.567.890-00" },
    { name: "Pedro Lima", phone: "(11) 93456-7890", email: "pedro@email.com", document: "345.678.901-00" },
    { name: "Fernanda Rocha", phone: "(11) 94567-8901", email: "fernanda@email.com", document: "456.789.012-00" },
    { name: "Ricardo Alves", phone: "(11) 95678-9012", email: "ricardo@email.com", document: "567.890.123-00" },
  ];

  const customers = [];
  for (const c of customersData) {
    const customer = await prisma.customer.create({
      data: {
        companyId: activeCompany.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        document: c.document,
      },
    });
    customers.push(customer);
  }

  // ── 6. Sample Quotes for Active Company ───────────────────────────────
  console.log("Creating sample quotes...");

  const quote1 = await prisma.quote.create({
    data: {
      companyId: activeCompany.id,
      customerId: customers[0].id,
      number: 1,
      status: "APPROVED",
      description: "Manutencao preventiva",
      subtotal: 250.0,
      total: 250.0,
      validUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          { description: "Troca de oleo", quantity: 1, unitPrice: 150, total: 150 },
          { description: "Filtro de ar", quantity: 1, unitPrice: 100, total: 100 },
        ],
      },
    },
  });

  await prisma.quote.create({
    data: {
      companyId: activeCompany.id,
      customerId: customers[1].id,
      number: 2,
      status: "DRAFT",
      description: "Revisao completa",
      subtotal: 500.0,
      total: 500.0,
      items: {
        create: [
          { description: "Revisao completa", quantity: 1, unitPrice: 500, total: 500 },
        ],
      },
    },
  });

  console.log("Sample quotes created.");

  // ── 7. Sample Service Orders for Active Company ───────────────────────
  console.log("Creating sample service orders...");

  await prisma.serviceOrder.create({
    data: {
      companyId: activeCompany.id,
      customerId: customers[0].id,
      quoteId: quote1.id,
      number: 1,
      status: "IN_PROGRESS",
      problemDescription: "Carro fazendo barulho no motor",
      total: 250.0,
      paymentStatus: "PENDING",
      items: {
        create: [
          { description: "Troca de oleo", quantity: 1, unitPrice: 150, total: 150 },
          { description: "Filtro de ar", quantity: 1, unitPrice: 100, total: 100 },
        ],
      },
    },
  });

  console.log("Sample service orders created.");

  // ── 8. Sample Products for Active Company ─────────────────────────────
  console.log("Creating sample products...");

  const productsData = [
    { name: "Oleo 5W30 Sintetico", sku: "OLEO-001", category: "Lubrificantes", quantity: 50, minStock: 10, costPrice: 25, salePrice: 45 },
    { name: "Filtro de Oleo", sku: "FIL-001", category: "Filtros", quantity: 30, minStock: 5, costPrice: 15, salePrice: 35 },
    { name: "Pastilha de Freio", sku: "FREIO-001", category: "Freios", quantity: 20, minStock: 5, costPrice: 40, salePrice: 80 },
    { name: "Amortecedor Dianteiro", sku: "AMORT-001", category: "Suspensao", quantity: 3, minStock: 5, costPrice: 120, salePrice: 220 },
    { name: "Bateria 60AH", sku: "BAT-001", category: "Eletrica", quantity: 8, minStock: 3, costPrice: 180, salePrice: 320 },
  ];

  for (const p of productsData) {
    await prisma.product.create({
      data: {
        companyId: activeCompany.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        quantity: p.quantity,
        minStock: p.minStock,
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        description: "Produto: " + p.name,
      },
    });
  }

  console.log("Sample products created.");

  // ── 9. Sample Financial Transactions for Active Company ──────────────
  console.log("Creating sample financial transactions...");

  const financialData = [
    { type: "RECEIVABLE", description: "Conserto Gol", category: "Servicos", amount: 850, dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), status: "PENDING", customerId: customers[0].id },
    { type: "RECEIVABLE", description: "Revisao Corolla", category: "Servicos", amount: 1200, dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), status: "PENDING", customerId: customers[1].id },
    { type: "PAYABLE", description: "Aluguel Oficina", category: "Fixas", amount: 2000, dueDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), status: "PENDING" },
    { type: "PAYABLE", description: "Energia Eletrica", category: "Fixas", amount: 450, dueDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000), status: "PENDING" },
    { type: "RECEIVABLE", description: "Troca Oleo Fiat", category: "Servicos", amount: 150, dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), paidAt: now, status: "PAID", customerId: customers[2].id },
  ];

  for (const f of financialData) {
    await prisma.financialTransaction.create({
      data: {
        companyId: activeCompany.id,
        type: f.type,
        description: f.description,
        category: f.category,
        amount: f.amount,
        dueDate: f.dueDate,
        paidAt: f.paidAt || null,
        status: f.status,
        customerId: f.customerId || null,
      },
    });
  }

  console.log("Sample financial transactions created.");

  // ── 10. Sample Appointments for Active Company ──────────────────────
  console.log("Creating sample appointments...");

  const tomorrow9am = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  tomorrow9am.setHours(9, 0, 0, 0);

  const dayAfter1430 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  dayAfter1430.setHours(14, 30, 0, 0);

  await prisma.appointment.create({
    data: {
      companyId: activeCompany.id,
      customerId: customers[0].id,
      title: "Revisao Gol",
      description: "Revisao de 50.000km",
      dateTime: tomorrow9am,
      duration: 120,
      status: "CONFIRMED",
    },
  });

  await prisma.appointment.create({
    data: {
      companyId: activeCompany.id,
      customerId: customers[1].id,
      title: "Troca Oleo",
      description: "Troca de oleo e filtro",
      dateTime: dayAfter1430,
      duration: 60,
      status: "SCHEDULED",
    },
  });

  console.log("Sample appointments created.");

  // ── 11. Sample Catalog Items for Active Company ────────────────────
  console.log("Creating sample catalog items...");

  const catalogData = [
    { name: "Troca de Oleo Completa", description: "Troca de oleo sintetico 5W30 + filtro", category: "Servicos", price: 180 },
    { name: "Alinhamento e Balanceamento", description: "Alinhamento 3D + balanceamento das 4 rodas", category: "Servicos", price: 120 },
    { name: "Pastilha de Freio Dianteira", description: "Jogo de pastilhas de freio originais", category: "Pecas", price: 160 },
  ];

  for (const c of catalogData) {
    await prisma.catalogItem.create({
      data: {
        companyId: activeCompany.id,
        name: c.name,
        description: c.description,
        category: c.category,
        price: c.price,
      },
    });
  }

  console.log("Sample catalog items created.");

  // ── 12. Sample Menu Items for Active Company ───────────────────────
  console.log("Creating sample menu items...");

  await prisma.menuItem.create({
    data: {
      companyId: activeCompany.id,
      name: "Troca de Oleo",
      description: "Servico completo de troca de oleo",
      category: "Servicos",
      price: 80,
      sortOrder: 1,
    },
  });

  await prisma.menuItem.create({
    data: {
      companyId: activeCompany.id,
      name: "Revisao Preventiva",
      description: "Revisao completa de 30 itens",
      category: "Servicos",
      price: 350,
      sortOrder: 2,
    },
  });

  await prisma.menuItem.create({
    data: {
      companyId: activeCompany.id,
      name: "Scanner Automotivo",
      description: "Diagnostico eletronico completo",
      category: "Diagnostico",
      price: 60,
      sortOrder: 3,
    },
  });

  console.log("Sample menu items created.");

  // ── Done ──────────────────────────────────────────────────────────────
  console.log("\nSeed completed successfully!");
  console.log("─────────────────────────────────────────────────────");
  console.log("Login credentials:");
  console.log("  Super Admin:  admin@gestorlocal.com / admin123");
  console.log("  Trial:        silva@esilva.com / silva123");
  console.log("  Active Admin: marcos@mecanicacentral.com / marcos123");
  console.log("  Active Staff: ana@mecanicacentral.com / ana123");
  console.log("─────────────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });