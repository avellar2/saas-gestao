import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/empresas/me/modules
 *
 * Returns the active modules for the current user's company,
 * along with whether the company has an active Stripe subscription.
 * Used by the upgrade page to determine which modules are already active.
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const user = session.user as Record<string, unknown>;
  const companyId = user.companyId as string;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      companyModules: {
        where: { active: true },
        select: { moduleKey: true, module: { select: { name: true } } },
      },
      subscription: {
        select: { stripeSubscriptionId: true, status: true },
      },
    },
  });

  if (!company) {
    return NextResponse.json(
      { error: "Empresa nao encontrada" },
      { status: 404 }
    );
  }

  const activeModules = company.companyModules.map((cm) => ({
    key: cm.moduleKey,
    name: cm.module.name,
  }));

  const hasSubscription = !!company.subscription;
  const hasStripeSubscription = !!company.subscription?.stripeSubscriptionId;
  const isTrial = company.status === "TRIAL" || company.subscription?.status === "TRIAL";

  return NextResponse.json({
    activeModules,
    hasStripeSubscription,
    hasSubscription,
    isTrial,
  });
}