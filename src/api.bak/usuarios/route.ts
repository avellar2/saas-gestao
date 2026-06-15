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

export async function GET(request: Request) {
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

  const tenant = tenantPrisma(companyId);

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    tenant.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    tenant.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
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
  const hasAccess = await checkModuleAccess(companyId, "users_permissions");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const tenant = tenantPrisma(companyId);

  const body = await request.json();
  const { name, email, password, role } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Nome e obrigatorio" },
      { status: 400 }
    );
  }

  if (!email || !email.trim()) {
    return NextResponse.json(
      { error: "Email e obrigatorio" },
      { status: 400 }
    );
  }

  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "Senha deve ter no minimo 6 caracteres" },
      { status: 400 }
    );
  }

  if (role && role === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Nao e possivel criar usuario SUPER_ADMIN" },
      { status: 400 }
    );
  }

  // Check email uniqueness within the company
  const existingUser = await tenant.user.findFirst({
    where: { email: email.trim() },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "Este email ja esta em uso nesta empresa" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const userRole = role || "STAFF";

  const user = await tenant.user.create({
    data: {
      name: name.trim(),
      email: email.trim(),
      passwordHash,
      role: userRole,
      active: true,
    } as Parameters<typeof tenant.user.create>[0]["data"],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "CREATE",
    entity: "user",
    entityId: user.id,
    details: `Nome: ${user.name} - Email: ${user.email}`,
  });

  return NextResponse.json(user, { status: 201 });
}
