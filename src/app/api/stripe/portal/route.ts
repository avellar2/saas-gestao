import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, getAppUrl } from "@/lib/stripe";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  try {
    const company = await prisma.company.findUnique({ where: { id: companyId } });

    if (!company?.stripeCustomerId) {
      return NextResponse.json(
        { error: "Nenhuma assinatura encontrada" },
        { status: 400 }
      );
    }

    const portal = await getStripe().billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: `${getAppUrl()}/dashboard`,
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
