import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

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
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;
  const sort = searchParams.get("sort") || "createdAt_desc";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";

  const where: Record<string, unknown> = {};
  if (type) {
    where.type = type;
  }
  if (status) {
    where.status = status;
  }
  if (search) {
    where.description = { contains: search, mode: "insensitive" };
  }
  if (dateFrom || dateTo) {
    const dueDateFilter: Record<string, Date> = {};
    if (dateFrom) dueDateFilter.gte = new Date(dateFrom);
    if (dateTo) dueDateFilter.lte = new Date(dateTo);
    where.dueDate = dueDateFilter;
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  const [transactions, total] = await Promise.all([
    tenant.financialTransaction.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        customer: { select: { id: true, name: true } },
      },
    }),
    tenant.financialTransaction.count({ where }),
  ]);

  return NextResponse.json({
    transactions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
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

  const tenant = tenantPrisma(companyId);

  const body = await request.json();
  const { type, description, category, amount, dueDate, customerId, notes } = body;

  if (!type || !["RECEIVABLE", "PAYABLE"].includes(type)) {
    return NextResponse.json(
      { error: "Tipo invalido. Use RECEIVABLE ou PAYABLE" },
      { status: 400 }
    );
  }

  if (!description || !description.trim()) {
    return NextResponse.json(
      { error: "Descricao e obrigatoria" },
      { status: 400 }
    );
  }

  if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json(
      { error: "Valor invalido" },
      { status: 400 }
    );
  }

  const transaction = await tenant.financialTransaction.create({
    data: {
      type,
      description: description.trim(),
      category: category?.trim() || null,
      amount: Number(amount),
      dueDate: dueDate ? new Date(dueDate) : null,
      customerId: customerId || null,
      notes: notes?.trim() || null,
    } as Parameters<typeof tenant.financialTransaction.create>[0]["data"],
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "CREATE",
    entity: "financial",
    entityId: transaction.id,
    details: `${transaction.type === "RECEIVABLE" ? "Receber" : "Pagar"} - ${transaction.description} - R$ ${Number(transaction.amount).toFixed(2)}`,
  });

  return NextResponse.json(transaction, { status: 201 });
}
