import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateMonthlyPrice } from "@/lib/pricing";
import { MODULE_KEYS } from "@/lib/modules";
import type { ModuleKey } from "@/lib/modules";

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
  } = body;

  if (!name) {
    return NextResponse.json({ error: "Nome e obrigatorio" }, { status: 400 });
  }

  // P18 fix: validar trialDays entre 1 e 90. Default 15.
  const rawTrialDays = body.trialDays;
  let trialDays = 15;
  if (rawTrialDays !== undefined && rawTrialDays !== null) {
    const n = Number(rawTrialDays);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 90) {
      return NextResponse.json(
        { error: "trialDays deve ser um número inteiro entre 1 e 90" },
        { status: 400 }
      );
    }
    trialDays = n;
  }

  // P19 fix: empresa nova sempre nasce TRIAL. Não é possível criar ACTIVE
  // direto sem fluxo Stripe. Ativação manual deve ser via PUT separado.
  const status = "TRIAL";
  const trialStartsAt = new Date();
  const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

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
      status: "TRIAL",
      planName: "Inicial",
      basePrice: 49.0,
      modulesCount: 0,
      monthlyPrice: calculateMonthlyPrice([]),
      trialEndsAt: trialEndsAt,
    },
  });

  // Log de auditoria
  console.log(`[ADMIN] Nova empresa criada: ${company.id} (${company.name}) — TRIAL ${trialDays} dias`);

  return NextResponse.json(company, { status: 201 });
}