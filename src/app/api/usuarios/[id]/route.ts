import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import bcrypt from "bcryptjs";

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
  const hasAccess = await checkModuleAccess(companyId, "users_permissions");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const user = await tenant.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Usuario nao encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(user);
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

  const hasAccess = await checkModuleAccess(companyId, "users_permissions");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Usuario nao encontrado" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const { name, email, password, role, active } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Nome e obrigatorio" },
      { status: 400 }
    );
  }

  if (role && role === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Nao e possivel alterar para SUPER_ADMIN" },
      { status: 400 }
    );
  }

  // Check email uniqueness within the company (exclude current user)
  if (email && email.trim() !== existing.email) {
    const userWithSameEmail = await tenant.user.findFirst({
      where: { email: email.trim(), id: { not: id } },
    });

    if (userWithSameEmail) {
      return NextResponse.json(
        { error: "Este email ja esta em uso nesta empresa" },
        { status: 409 }
      );
    }
  }

  const updateData: Record<string, unknown> = {
    name: name.trim(),
  };

  if (email?.trim()) {
    updateData.email = email.trim();
  }

  if (password) {
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Senha deve ter no minimo 6 caracteres" },
        { status: 400 }
      );
    }
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  if (role) {
    updateData.role = role;
  }

  if (active !== undefined) {
    updateData.active = active;
  }

  const updated = await tenant.user.update({
    where: { id },
    data: updateData as Parameters<typeof tenant.user.update>[0]["data"],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "UPDATE",
    entity: "user",
    entityId: id,
    details: `Nome: ${existing.name} - Email: ${existing.email}`,
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

  const hasAccess = await checkModuleAccess(companyId, "users_permissions");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const sessionUserId = (session.user as Record<string, unknown>).id as string;

  // Cannot delete yourself
  if (id === sessionUserId) {
    return NextResponse.json(
      { error: "Voce nao pode excluir seu proprio usuario" },
      { status: 400 }
    );
  }

  const existing = await tenant.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Usuario nao encontrado" },
      { status: 404 }
    );
  }

  await tenant.user.delete({ where: { id } });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "DELETE",
    entity: "user",
    entityId: id,
    details: `Nome: ${existing.name} - Email: ${existing.email}`,
  });

  return NextResponse.json({ success: true });
}