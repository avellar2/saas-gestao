import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { isTrialLimitReached } from "@/lib/company-limits";
import { logActivity } from "@/lib/activity-log";
import { CompanyStatus } from "@/generated/prisma/client";
import { appointmentSchema } from "@/lib/validations";

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

  const hasAccess = await checkModuleAccess(companyId, "scheduling");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const tenant = tenantPrisma(companyId);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;
  const sort = searchParams.get("sort") || "dateTime_asc";

  const where: Record<string, unknown> = {};
  if (status && ["SCHEDULED", "CONFIRMED", "CANCELLED", "COMPLETED"].includes(status)) {
    where.status = status;
  }
  if (dateFrom || dateTo) {
    where.dateTime = {};
    if (dateFrom) (where.dateTime as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.dateTime as Record<string, unknown>).lte = new Date(dateTo);
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  const [appointments, total] = await Promise.all([
    tenant.appointment.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: { customer: { select: { id: true, name: true, phone: true, whatsapp: true } } },
    }),
    tenant.appointment.count({ where }),
  ]);

  return NextResponse.json({ appointments, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "scheduling");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const companyStatus = (session.user as Record<string, unknown>).companyStatus as CompanyStatus;
  const tenant = tenantPrisma(companyId);

  const currentCount = await tenant.appointment.count();
  if (isTrialLimitReached(companyStatus, "scheduling", currentCount)) {
    return NextResponse.json(
      { error: "Limite de agendamentos atingido. Faca upgrade do seu plano para adicionar mais." },
      { status: 403 }
    );
  }

  const body = await request.json();

  const result = appointmentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || "Dados invalidos" },
      { status: 400 }
    );
  }

  const { title, description, dateTime, duration, status, customerId, notes } = result.data;

  const appointment = await tenant.appointment.create({
    data: {
      companyId,
      title: title.trim(),
      description: description?.trim() || null,
      dateTime: new Date(dateTime),
      duration: duration || 60,
      status: status || "SCHEDULED",
      customerId: customerId || null,
      notes: notes?.trim() || null,
    },
    include: { customer: { select: { id: true, name: true, phone: true, whatsapp: true } } },
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({ tenant, userId, userName, action: "CREATE", entity: "appointment", entityId: appointment.id, details: `${title} - ${new Date(dateTime).toLocaleString("pt-BR")}` });

  return NextResponse.json(appointment, { status: 201 });
}