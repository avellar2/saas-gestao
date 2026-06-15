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
  const hasAccess = await checkModuleAccess(companyId, "customers");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const customer = await tenant.customer.findUnique({
    where: { id },
    include: {
      quotes: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          createdAt: true,
        },
      },
      serviceOrders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          createdAt: true,
        },
      },
    },
  });

  if (!customer) {
    return NextResponse.json(
      { error: "Cliente nao encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(customer);
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

  const hasAccess = await checkModuleAccess(companyId, "customers");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.customer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Cliente nao encontrado" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const { name, phone, whatsapp, email, document, address, notes } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Nome e obrigatorio" },
      { status: 400 }
    );
  }

  const updated = await tenant.customer.update({
    where: { id },
    data: {
      name: name.trim(),
      phone: phone?.trim() || null,
      whatsapp: whatsapp?.trim() || null,
      email: email?.trim() || null,
      document: document?.trim() || null,
      address: address?.trim() || null,
      notes: notes?.trim() || null,
    } as Parameters<typeof tenant.customer.update>[0]["data"],
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "UPDATE",
    entity: "customer",
    entityId: id,
    details: `Nome: ${existing.name}`,
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

  const hasAccess = await checkModuleAccess(companyId, "customers");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.customer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Cliente nao encontrado" },
      { status: 404 }
    );
  }

  await tenant.customer.delete({ where: { id } });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "DELETE",
    entity: "customer",
    entityId: id,
    details: `Nome: ${existing.name}`,
  });

  return NextResponse.json({ success: true });
}