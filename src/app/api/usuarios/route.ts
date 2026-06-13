import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { isTrialLimitReached } from "@/lib/company-limits";
import { logActivity } from "@/lib/activity-log";
import { CompanyStatus } from "@/generated/prisma/client";
import { userSchema } from "@/lib/validations";

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
  const sort = searchParams.get("sort") || "createdAt_desc";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  const [users, total] = await Promise.all([
    tenant.user.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    }),
    tenant.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "users_permissions");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const companyStatus = (session.user as Record<string, unknown>).companyStatus as CompanyStatus;
  const tenant = tenantPrisma(companyId);

  const currentCount = await tenant.user.count();
  if (isTrialLimitReached(companyStatus, "users", currentCount)) {
    return NextResponse.json(
      { error: "Limite de usuarios atingido. Faca upgrade do seu plano para adicionar mais." },
      { status: 403 }
    );
  }

  const body = await request.json();

  const result = userSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || "Dados invalidos" },
      { status: 400 }
    );
  }

  const { name, email, password, role, active } = result.data;

  const existingUser = await tenant.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "Email ja cadastrado nesta empresa" }, { status: 409 });
  }

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await tenant.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      companyId,
      active: active ?? true,
    },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({ tenant, userId, userName, action: "CREATE", entity: "user", entityId: user.id, details: `Nome: ${user.name} - Email: ${user.email}` });

  return NextResponse.json(user, { status: 201 });
}