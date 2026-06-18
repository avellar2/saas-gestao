import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { findCustomerInCompany, notFoundResponse } from "@/lib/tenant-guard";

async function checkModuleAccess(companyId: string, moduleKey: string): Promise<boolean> {
  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_moduleKey: { companyId, moduleKey } },
  });
  return companyModule?.active ?? false;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const appointment = await tenant.appointment.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          whatsapp: true,
          email: true,
        },
      },
    },
  });

  if (!appointment) {
    return NextResponse.json(
      { error: "Agendamento nao encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(appointment);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "scheduling");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.appointment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Agendamento nao encontrado" },
      { status: 404 }
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

  // P23 fix: validar customerId pertence à empresa
  if (customerId !== undefined && customerId !== null && customerId !== "") {
    const customer = await findCustomerInCompany(tenant, customerId);
    if (!customer) return notFoundResponse("Cliente");
  }

  const data: Record<string, unknown> = {
    title: title.trim(),
  };

  if (description !== undefined) data.description = description?.trim() || null;
  if (dateTime !== undefined) data.dateTime = new Date(dateTime);
  if (duration !== undefined) data.duration = parseInt(duration, 10);
  if (status !== undefined) data.status = status;
  if (notes !== undefined) data.notes = notes?.trim() || null;
  if (customerId !== undefined) data.customerId = customerId || null;

  const updated = await tenant.appointment.update({
    where: { id },
    data: data as Parameters<typeof tenant.appointment.update>[0]["data"],
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "UPDATE",
    entity: "appointment",
    entityId: id,
    details: `Titulo: ${existing.title}`,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "scheduling");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.appointment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Agendamento nao encontrado" },
      { status: 404 }
    );
  }

  await tenant.appointment.delete({ where: { id } });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "DELETE",
    entity: "appointment",
    entityId: id,
    details: `Titulo: ${existing.title}`,
  });

  return NextResponse.json({ success: true });
}
