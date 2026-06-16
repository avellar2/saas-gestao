import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { isTrialLimitReached } from "@/lib/company-limits";
import { logActivity } from "@/lib/activity-log";
import { CompanyStatus } from "@/generated/prisma/client";
import { financialTransactionSchema } from "@/lib/validations";
import { getMonthRange } from "@/lib/finance-helpers";

async function checkModuleAccess(companyId: string, moduleKey: string): Promise<boolean> {
  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_moduleKey: { companyId, moduleKey } },
  });
  return companyModule?.active ?? false;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "finance");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const tenant = tenantPrisma(companyId);

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const month = searchParams.get("month") || "";
  const origin = searchParams.get("origin") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;
  const sort = searchParams.get("sort") || "createdAt_desc";

  const where: Record<string, unknown> = {};
  if (type && (type === "RECEIVABLE" || type === "PAYABLE")) {
    where.type = type;
  }
  if (status && ["PENDING", "PAID", "OVERDUE", "CANCELLED"].includes(status)) {
    where.status = status;
  }

  // Filtro por mês
  if (month) {
    const { start, end } = getMonthRange(month);
    where.OR = [
      { status: "PAID", paidAt: { gte: start, lte: end } },
      { status: { not: "PAID" }, dueDate: { gte: start, lte: end } },
    ];
  }

  // Filtro por origem
  if (origin === "os") {
    where.serviceOrderId = { not: null };
  } else if (origin === "menu") {
    where.menuOrderId = { not: null };
  } else if (origin === "manual") {
    where.serviceOrderId = null;
    where.menuOrderId = null;
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  const [transactions, total] = await Promise.all([
    tenant.financialTransaction.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: { customer: { select: { id: true, name: true } } },
    }),
    tenant.financialTransaction.count({ where }),
  ]);

  const serialized = transactions.map((t) => ({ ...t, amount: Number(t.amount) }));

  return NextResponse.json({ transactions: serialized, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "finance");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const companyStatus = (session.user as Record<string, unknown>).companyStatus as CompanyStatus;
  const tenant = tenantPrisma(companyId);

  const currentCount = await tenant.financialTransaction.count();
  if (isTrialLimitReached(companyStatus, "finance", currentCount)) {
    return NextResponse.json(
      { error: "Limite de transacoes atingido. Faca upgrade do seu plano para adicionar mais." },
      { status: 403 }
    );
  }

  const body = await request.json();

  const result = financialTransactionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || "Dados invalidos" },
      { status: 400 }
    );
  }

  const { type, description, category, amount, dueDate, customerId, notes, status } = result.data;

  const transaction = await tenant.financialTransaction.create({
    data: {
      companyId,
      type,
      description: description.trim(),
      category: category?.trim() || null,
      amount,
      dueDate: dueDate ? new Date(dueDate) : null,
      customerId: customerId || null,
      notes: notes?.trim() || null,
      status: status || "PENDING",
    },
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({ tenant, userId, userName, action: "CREATE", entity: "financial", entityId: transaction.id, details: `${type}: ${description} - R$ ${Number(amount).toFixed(2)}` });

  return NextResponse.json({ ...transaction, amount: Number(transaction.amount) }, { status: 201 });
}