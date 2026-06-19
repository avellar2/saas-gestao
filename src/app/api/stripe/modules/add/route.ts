import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, getModulePriceId, getBasePriceId } from "@/lib/stripe";
import { isPurchasable, getModuleConfig, CORE_MODULES } from "@/lib/modules";
import { calculateMonthlyPrice } from "@/lib/pricing";

/**
 * POST /api/stripe/modules/add
 *
 * Adds a module to an existing Stripe subscription as a new subscription item.
 * Only accessible by COMPANY_ADMIN.
 * Does NOT activate the module immediately — activation happens via reconciliation
 * after payment confirmation (invoice.paid or subscription.updated).
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
      { error: "Apenas administradores podem adicionar modulos" },
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

    // Validate module is purchasable
    if (!isPurchasable(moduleKey)) {
      const config = getModuleConfig(moduleKey);
      if (config?.status === "legacy") {
        return NextResponse.json(
          { error: "Este modulo foi descontinuado" },
          { status: 400 }
        );
      }
      if (config?.status === "coming_soon") {
        return NextResponse.json(
          { error: "Este modulo estara disponivel em breve" },
          { status: 400 }
        );
      }
      if (config?.type === "core") {
        return NextResponse.json(
          { error: "Modulo core esta sempre incluso e nao pode ser adicionado separadamente" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Modulo invalido ou nao disponivel" },
        { status: 400 }
      );
    }

    // Validate module is not already active
    const existingModule = await prisma.companyModule.findUnique({
      where: { companyId_moduleKey: { companyId, moduleKey } },
    });

    if (existingModule?.active) {
      return NextResponse.json(
        { error: "Este modulo ja esta ativo" },
        { status: 409 }
      );
    }

    // Get Price ID for the module
    const priceId = getModulePriceId(moduleKey);
    if (!priceId) {
      return NextResponse.json(
        { error: "Configuracao de pagamento incompleta para este modulo. Contate o suporte." },
        { status: 500 }
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

    if (!company.stripeCustomerId) {
      return NextResponse.json(
        { error: "Empresa nao possui cliente Stripe. Realize o primeiro checkout primeiro." },
        { status: 400 }
      );
    }

    if (!company.subscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "Empresa nao possui assinatura ativa. Realize o primeiro checkout primeiro." },
        { status: 400 }
      );
    }

    const stripeSubscriptionId = company.subscription.stripeSubscriptionId;

    // Verify the subscription exists and is active in Stripe
    const stripe = getStripe();
    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    } catch {
      return NextResponse.json(
        { error: "Assinatura nao encontrada no Stripe" },
        { status: 400 }
      );
    }

    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return NextResponse.json(
        { error: "Assinatura nao esta ativa. Contate o suporte." },
        { status: 400 }
      );
    }

    // Check if a subscription item for this price already exists
    const existingItem = subscription.items.data.find(
      (item) => item.price.id === priceId
    );

    if (existingItem) {
      return NextResponse.json(
        { error: "Este modulo ja existe na assinatura" },
        { status: 409 }
      );
    }

    // Create subscription item with idempotency key
    // payment_behavior: "pending_if_incomplete" handles SCA by not activating until payment confirms
    // proration_behavior: "always_invoice" charges proration immediately
    try {
      await stripe.subscriptionItems.create(
        {
          subscription: stripeSubscriptionId,
          price: priceId,
          metadata: {
            moduleKey,
            companyId,
          },
          // SCA: if payment requires authentication, keep the item pending instead of failing
          payment_behavior: "pending_if_incomplete",
          // Invoice the proration immediately so the module activates as soon as SCA completes
          proration_behavior: "always_invoice",
        },
        {
          idempotencyKey: `add-module-${companyId}-${moduleKey}-${subscription.items.data[0]?.id}`,
        }
      );
    } catch (stripeError: unknown) {
      console.error("Stripe subscription item creation error:", stripeError);
      const errorMessage = stripeError instanceof Error ? stripeError.message : "Erro desconhecido";
      return NextResponse.json(
        { error: `Erro ao adicionar modulo na assinatura: ${errorMessage}` },
        { status: 500 }
      );
    }

    // Module will be activated by webhook reconciliation after payment confirmation.
    // For now, just return success.
    return NextResponse.json({
      success: true,
      message: "Modulo adicionado a assinatura. Sera ativado apos confirmacao de pagamento.",
      moduleKey,
    });
  } catch (error) {
    console.error("Add module error:", error);
    return NextResponse.json(
      { error: "Erro ao adicionar modulo" },
      { status: 500 }
    );
  }
}