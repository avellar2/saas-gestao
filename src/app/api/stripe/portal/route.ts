import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, getAppUrl } from "@/lib/stripe";

/**
 * GET /api/stripe/portal
 *
 * Creates a Stripe Billing Portal session for the current user's company.
 * The portal is restricted to:
 * - Updating payment method
 * - Viewing invoices
 * - Downloading receipts
 * - Cancelling the subscription (if enabled)
 *
 * Adding/removing modules is handled inside the AVGESTÃO app,
 * not through the Stripe Portal.
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company?.stripeCustomerId) {
      return NextResponse.json(
        { error: "Nenhuma assinatura encontrada" },
        { status: 400 }
      );
    }

    const baseUrl = getAppUrl();

    // Create portal session with restricted configuration
    // Note: The portal configuration should be created in the Stripe Dashboard
    // with only payment method, invoices, and cancellation enabled.
    // Product/plan changes should be DISABLED in the portal.
    const portal = await getStripe().billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: `${baseUrl}/dashboard`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error("Stripe portal error:", error);
    return NextResponse.json(
      { error: "Erro ao abrir portal de pagamento" },
      { status: 500 }
    );
  }
}