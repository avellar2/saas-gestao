import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { isCoreModule, getModuleConfig } from "@/lib/modules";
import { calculateMonthlyPrice } from "@/lib/pricing";

/**
 * POST /api/stripe/modules/remove
 *
 * Removes a module from an existing Stripe subscription by deleting its subscription item.
 * Only accessible by COMPANY_ADMIN.
 * Core modules and the included module cannot be removed.
 * Module deactivation happens via reconciliation after the subscription is updated.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const user = session.user as Record<string, unknown>;
  const companyId = user.companyId as string;
  const userRole = user.role as string;

  if (userRole !== "COMPANY_ADMIN" && userRole !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores podem remover modulos" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { moduleKey } = body;

    if (!moduleKey) {
      return NextResponse.json(
        { error: "moduleKey e obrigatorio" },
        { status: 400 }
      );
    }

    // Cannot remove core modules
    if (isCoreModule(moduleKey)) {
      return NextResponse.json(
        { error: "Modulos core nao podem ser removidos" },
        { status: 400 }
      );
    }

    // Get company and subscription
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { subscription: true },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Empresa nao encontrada" },
        { status: 404 }
      );
    }

    if (!company.subscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "Empresa nao possui assinatura ativa" },
        { status: 400 }
      );
    }

    // Cannot remove the included module
    if (company.subscription.includedModuleKey === moduleKey) {
      return NextResponse.json(
        { error: "O modulo incluso no plano base nao pode ser removido automaticamente. Entre em contato com o suporte para trocar o modulo incluso." },
        { status: 400 }
      );
    }

    // Get the CompanyModule to find the subscription item ID
    const companyModule = await prisma.companyModule.findUnique({
      where: { companyId_moduleKey: { companyId, moduleKey } },
    });

    if (!companyModule) {
      return NextResponse.json(
        { error: "Modulo nao encontrado para esta empresa" },
        { status: 404 }
      );
    }

    if (!companyModule.active) {
      return NextResponse.json(
        { error: "Modulo ja esta inativo" },
        { status: 400 }
      );
    }

    if (!companyModule.stripeSubscriptionItemId) {
      // Module doesn't have a subscription item (e.g., it was activated via admin toggle)
      // Deactivate directly without Stripe
      await prisma.companyModule.update({
        where: { id: companyModule.id },
        data: {
          active: false,
          deactivatedAt: new Date(),
          stripeSubscriptionItemId: null,
        },
      });

      // Recalculate monthly price
      const activeModules = await prisma.companyModule.findMany({
        where: { companyId, active: true },
        select: { moduleKey: true },
      });
      const activeKeys = activeModules.map((m) => m.moduleKey);
      const newPrice = calculateMonthlyPrice(activeKeys);

      await prisma.company.update({
        where: { id: companyId },
        data: { monthlyPrice: newPrice },
      });

      if (company.subscription) {
        await prisma.subscription.update({
          where: { companyId },
          data: {
            modulesCount: activeKeys.length,
            monthlyPrice: newPrice,
          },
        });
      }

      // Log activity
      await prisma.activityLog.create({
        data: {
          companyId,
          userId: user.id as string,
          userName: user.name as string,
          action: "UPDATE",
          entity: "company",
          entityId: companyId,
          details: `Modulo "${getModuleConfig(moduleKey)?.name || moduleKey}" removido (sem item no Stripe)`,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Modulo removido com sucesso.",
      });
    }

    // Remove subscription item from Stripe
    const stripe = getStripe();
    try {
      await stripe.subscriptionItems.del(companyModule.stripeSubscriptionItemId, {
        proration_behavior: "create_prorations",
      });
    } catch (stripeError: unknown) {
      console.error("Stripe subscription item deletion error:", stripeError);
      const errorMessage = stripeError instanceof Error ? stripeError.message : "Erro desconhecido";

      // If the item was already deleted, we can proceed
      if (errorMessage.includes("No such subscription_item")) {
        // Item already deleted in Stripe, proceed with local deactivation
      } else {
        return NextResponse.json(
          { error: `Erro ao remover modulo da assinatura: ${errorMessage}` },
          { status: 500 }
        );
      }
    }

    // Retrieve updated subscription and reconcile
    const subscription = await stripe.subscriptions.retrieve(
      company.subscription.stripeSubscriptionId
    );

    // Deactivation will be handled by reconciliation in the webhook
    // But we also update locally for immediate feedback
    await prisma.companyModule.update({
      where: { id: companyModule.id },
      data: {
        stripeSubscriptionItemId: null,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        companyId,
        userId: user.id as string,
        userName: user.name as string,
        action: "UPDATE",
        entity: "company",
        entityId: companyId,
        details: `Modulo "${getModuleConfig(moduleKey)?.name || moduleKey}" removido da assinatura`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Modulo removido da assinatura. A desativacao sera processada apos confirmacao.",
    });
  } catch (error) {
    console.error("Remove module error:", error);
    return NextResponse.json(
      { error: "Erro ao remover modulo" },
      { status: 500 }
    );
  }
}