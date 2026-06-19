import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, getAppUrl, getBasePriceId, LEGACY_PLANS, type LegacyPlanKey } from "@/lib/stripe";
import { isPurchasable, getModuleConfig } from "@/lib/modules";

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for subscribing to a module.
 *
 * Two modes:
 * 1. Modular (new): Creates a subscription with the base price item.
 *    Metadata includes companyId and includedModuleKey.
 * 2. Legacy (old): Creates a subscription with the basic plan price.
 *    Metadata includes companyId, plan, and moduleKey.
 *    Only used for backward compatibility with existing flows.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const user = session.user as Record<string, unknown>;
  const companyId = user.companyId as string;
  const userRole = user.role as string;

  // Only COMPANY_ADMIN can make purchases
  if (userRole !== "COMPANY_ADMIN" && userRole !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores podem realizar compras" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { includedModuleKey } = body;

    // ── Modular checkout: first module purchase ──
    // The user selects their first module (included in the base price).
    // This creates a new subscription with only the base price.
    if (includedModuleKey) {
      // Validate the module is purchasable
      if (!isPurchasable(includedModuleKey)) {
        const config = getModuleConfig(includedModuleKey);
        if (config?.status === "legacy") {
          return NextResponse.json(
            { error: "Este modulo foi descontinuado e nao esta disponivel para compra" },
            { status: 400 }
          );
        }
        if (config?.status === "coming_soon") {
          return NextResponse.json(
            { error: "Este modulo estara disponivel em breve" },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: "Modulo invalido ou nao disponivel para compra" },
          { status: 400 }
        );
      }

      // Check if company already has an active Stripe subscription
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

      // If subscription already has a Stripe ID, use the add-module endpoint instead
      if (company.subscription?.stripeSubscriptionId) {
        return NextResponse.json(
          { error: "Empresa ja possui assinatura ativa. Use o endpoint de adicao de modulo." },
          { status: 400 }
        );
      }

      // Check that the module is not already active
      const existingModule = await prisma.companyModule.findUnique({
        where: { companyId_moduleKey: { companyId, moduleKey: includedModuleKey } },
      });

      if (existingModule?.active) {
        return NextResponse.json(
          { error: "Este modulo ja esta ativo" },
          { status: 400 }
        );
      }

      // Get or create Stripe Customer
      let stripeCustomerId = company.stripeCustomerId;

      if (!stripeCustomerId) {
        const customer = await getStripe().customers.create({
          name: company.name,
          email: (user.email as string) || company.email || undefined,
          metadata: { companyId },
        });
        stripeCustomerId = customer.id;

        await prisma.company.update({
          where: { id: companyId },
          data: { stripeCustomerId },
        });
      }

      // Build success/cancel URLs
      const baseUrl = getAppUrl();
      const successUrl = `${baseUrl}/dashboard?upgrade=success&module=${includedModuleKey}`;
      const cancelUrl = `${baseUrl}/upgrade?module=${includedModuleKey}`;

      // Validate base price ID is configured
      const basePriceId = getBasePriceId();
      if (!basePriceId) {
        console.error("STRIPE_BASE_PRICE_ID not configured");
        return NextResponse.json(
          { error: "Configuracao de pagamento incompleta. Contate o suporte." },
          { status: 500 }
        );
      }

      // Create Checkout Session with only the base price
      // The included module is tracked via metadata, not as a separate item
      const checkout = await getStripe().checkout.sessions.create({
        customer: stripeCustomerId,
        mode: "subscription",
        line_items: [
          {
            price: basePriceId,
            quantity: 1,
          },
        ],
        metadata: {
          companyId,
          includedModuleKey,
          type: "first_checkout",
        },
        subscription_data: {
          metadata: {
            companyId,
            includedModuleKey,
          },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      return NextResponse.json({ url: checkout.url });
    }

    // ── Legacy checkout: BLOCKED ──
    // New Basic/Pro checkouts are no longer accepted.
    // Existing legacy subscriptions continue to work via webhooks,
    // but new purchases must use the modular flow (includedModuleKey).
    const { plan } = body;

    if (plan && LEGACY_PLANS[plan as LegacyPlanKey]) {
      return NextResponse.json(
        {
          error: "Os planos Basic e Pro foram descontinuados. Use o fluxo modular selecionando os modulos desejados.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Requisicao invalida. Forneça includedModuleKey para checkout modular." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Erro ao criar sessao de pagamento" },
      { status: 500 }
    );
  }
}