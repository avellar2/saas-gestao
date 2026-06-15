import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateMonthlyPrice } from "@/lib/pricing";
import { isCoreModule } from "@/lib/modules";
import type { CompanyStatus, SubscriptionStatus } from "@/generated/prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role;
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      users: {
        orderBy: { createdAt: "desc" },
      },
      companyModules: {
        include: {
          module: true,
        },
        orderBy: { moduleKey: "asc" },
      },
      subscription: true,
    },
  });

  if (!company) {
    return NextResponse.json(
      { error: "Empresa nao encontrada" },
      { status: 404 }
    );
  }

  const activeModuleKeys = company.companyModules
    .filter((cm) => cm.active)
    .map((cm) => cm.moduleKey);
  const calculatedPrice = calculateMonthlyPrice(activeModuleKeys);

  return NextResponse.json({
    ...company,
    calculatedPrice,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role;
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { moduleKey, moduleActive, ...updateData } = body;

  // Verify company exists
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) {
    return NextResponse.json(
      { error: "Empresa nao encontrada" },
      { status: 404 }
    );
  }

  // Handle module toggle
  if (moduleKey !== undefined) {
    // Prevent toggling core modules
    if (isCoreModule(moduleKey)) {
      return NextResponse.json(
        { error: "Nao e possivel desativar modulo core" },
        { status: 400 }
      );
    }

    const now = new Date();
    await prisma.companyModule.update({
      where: { companyId_moduleKey: { companyId: id, moduleKey } },
      data: {
        active: moduleActive ?? false,
        ...(moduleActive
          ? { activatedAt: now, deactivatedAt: null }
          : { deactivatedAt: now }),
      },
    });

    // Recalculate active modules and subscription price
    const activeCompanyModules = await prisma.companyModule.findMany({
      where: { companyId: id, active: true },
      select: { moduleKey: true },
    });
    const activeModuleKeysList = activeCompanyModules.map((m) => m.moduleKey);
    const activeModulesCount = activeModuleKeysList.length;
    const newPrice = calculateMonthlyPrice(activeModuleKeysList);

    await prisma.company.update({
      where: { id },
      data: { monthlyPrice: newPrice },
    });

    // Update subscription
    const subscription = await prisma.subscription.findUnique({
      where: { companyId: id },
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { companyId: id },
        data: {
          modulesCount: activeModulesCount,
          monthlyPrice: newPrice,
        },
      });
    }

    return NextResponse.json({ success: true, monthlyPrice: newPrice });
  }

  // Handle regular company data update
  const allowedFields = [
    "name",
    "tradeName",
    "document",
    "phone",
    "whatsapp",
    "email",
    "address",
    "status",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in updateData && updateData[key as keyof typeof updateData] !== undefined) {
      data[key] = updateData[key as keyof typeof updateData];
    }
  }

  // If status changed, also update subscription status
  if (data.status) {
    const statusValue = data.status as CompanyStatus;
    const subscriptionStatusMap: Record<string, SubscriptionStatus> = {
      TRIAL: "TRIAL",
      ACTIVE: "ACTIVE",
      SUSPENDED: "SUSPENDED",
      CANCELLED: "CANCELLED",
    };

    try {
      const existingSub = await prisma.subscription.findUnique({
        where: { companyId: id },
      });

      if (existingSub) {
        await prisma.subscription.update({
          where: { companyId: id },
          data: { status: subscriptionStatusMap[statusValue] || "TRIAL" as SubscriptionStatus },
        });
      }
    } catch {
      // If subscription update fails, log but don't block company update
      console.error(`Failed to update subscription for company ${id}`);
    }
  }

  const updated = await prisma.company.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}