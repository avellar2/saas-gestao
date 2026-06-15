import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateMonthlyPrice } from "@/lib/pricing";
import { MODULE_KEYS } from "@/types";
import type { ModuleKey } from "@/types";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role;
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users: true,
          companyModules: { where: { active: true } },
        },
      },
    },
  });

  return NextResponse.json(companies);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role;
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json();
  const {
    name,
    tradeName,
    document,
    phone,
    whatsapp,
    email,
    address,
    status = "TRIAL",
    trialDays = 15,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "Nome e obrigatorio" }, { status: 400 });
  }

  const trialStartsAt = status === "TRIAL" ? new Date() : null;
  const trialEndsAt =
    status === "TRIAL"
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
      : null;

  const company = await prisma.company.create({
    data: {
      name,
      tradeName: tradeName || null,
      document: document || null,
      phone: phone || null,
      whatsapp: whatsapp || null,
      email: email || null,
      address: address || null,
      status,
      trialStartsAt,
      trialEndsAt,
      monthlyPrice: 49.0,
    },
  });

  // Create CompanyModule entries for all modules
  await prisma.companyModule.createMany({
    data: MODULE_KEYS.map((moduleKey: ModuleKey) => ({
      companyId: company.id,
      moduleKey,
      active: false,
    })),
  });

  // Create Subscription
  await prisma.subscription.create({
    data: {
      companyId: company.id,
      status: status === "TRIAL" ? "TRIAL" : "ACTIVE",
      planName: "Inicial",
      basePrice: 49.0,
      modulesCount: 0,
      monthlyPrice: calculateMonthlyPrice([]),
      trialEndsAt: trialEndsAt,
    },
  });

  return NextResponse.json(company, { status: 201 });
}