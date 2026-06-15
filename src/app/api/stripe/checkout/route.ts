import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, PLANS, getAppUrl, type PlanKey } from "@/lib/stripe";
import { isPurchasable } from "@/lib/modules";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  try {
    const body = await request.json();
    const { plan, moduleKey } = body;

    // Validate module is purchasable (active, not core, not legacy, not coming_soon)
    if (moduleKey && !isPurchasable(moduleKey)) {
      return NextResponse.json(
        { error: "Modulo nao esta disponivel para contratacao" },
        { status: 400 }
      );
    }

    // Legacy flow: plan-based checkout (Basic/Pro)
    if (plan && PLANS[plan as PlanKey]) {
      const planConfig = PLANS[plan as PlanKey];

      // Get or create Stripe customer
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (!company) {
        return NextResponse.json({ error: "Empresa nao encontrada" }, { status: 404 });
      }

      let stripeCustomerId = company.stripeCustomerId;

      if (!stripeCustomerId) {
        const customer = await getStripe().customers.create({
          name: company.name,
          email: (session.user as Record<string, unknown>).email as string,
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
      const successUrl = moduleKey
        ? `${baseUrl}/dashboard?upgrade=success&module=${moduleKey}`
        : `${baseUrl}/dashboard?upgrade=success`;
      const cancelUrl = moduleKey
        ? `${baseUrl}/upgrade?module=${moduleKey}`
        : `${baseUrl}/upgrade`;

      // Create checkout session
      const checkout = await getStripe().checkout.sessions.create({
        customer: stripeCustomerId,
        mode: "subscription",
        line_items: [
          {
            price: planConfig.priceId,
            quantity: 1,
          },
        ],
        metadata: {
          companyId,
          plan: plan as string,
          moduleKey: moduleKey || "",
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      return NextResponse.json({ url: checkout.url });
    }

    return NextResponse.json({ error: "Plano invalido" }, { status: 400 });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Erro ao criar sessao de pagamento" },
      { status: 500 }
    );
  }
}