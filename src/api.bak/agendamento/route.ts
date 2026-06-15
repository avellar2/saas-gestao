import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { isTrialLimitReached } from "@/lib/company-limits";
import { logActivity } from "@/lib/activity-log";
import { CompanyStatus } from "@/generated/prisma/client";

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

  // Module guard check
  const hasAccess = await checkModuleAccess(companyId, "scheduling");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const tenant = tenantPrisma(companyId);

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;
  const sort = searchParams.get("sort") || "dateTime_desc";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }
  if (status) {
    where.status = status;
  }
  if (dateFrom || dateTo) {
    const dateTimeFilter: Record<string, Date> = {};
    if (dateFrom) dateTimeFilter.gte = new Date(dateFrom);
    if (dateTo) dateTimeFilter.lte = new Date(dateTo);
    where.dateTime = dateTimeFilter;
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  const [appointments, total] = await Promise.all([
    tenant.appointment.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    }),
    tenant.appointment.count({ where }),
  ]);

  return NextResponse.json({
    appointments,
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

  // Module guard check
  const hasAccess = await checkModuleAccess(companyId, "scheduling");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const companyStatus = (session.user as Record<string, unknown>)
    .companyStatus as CompanyStatus;
  const tenant = tenantPrisma(companyId);

  // Check trial limit
  const currentCount = await tenant.appointment.count();
  if (isTrialLimitReached(companyStatus, "scheduling", currentCount)) {
    return NextResponse.json(
      {
        error:
          "Limite de agendamentos atingido. Faca upgrade do seu plano para adicionar mais agendamentos.",
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { customerId, title, description, dateTime, duration, status, notes } = body;

  if (!title || !title.trim()) {
    return NextResponse.json(
      { error: "Titulo e obrigatorio" },
      { status: 400 }
    );
  }

  if (!dateTime) {
    return NextResponse.json(
      { error: "Data e hora sao obrigatorios" },
      { status: 400 }
    );
  }

  const appointment = await tenant.appointment.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      dateTime: new Date(dateTime),
      duration: duration ? parseInt(duration, 10) : 60,
      status: status || "SCHEDULED",
      notes: notes?.trim() || null,
      customerId: customerId || null,
      companyId,
    } as Parameters<typeof tenant.appointment.create>[0]["data"],
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "CREATE",
    entity: "appointment",
    entityId: appointment.id,
    details: `Título: ${appointment.title}`,
  });

  return NextResponse.json(appointment, { status: 201 });
}
