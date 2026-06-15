import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { CORE_MODULES } from "@/lib/modules";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkout = event.data.object;
        const companyId = checkout.metadata?.companyId;
        const plan = checkout.metadata?.plan;
        const moduleKey = checkout.metadata?.moduleKey;

        if (!companyId) break;

        const subscriptionId = checkout.subscription as string;

        // Get subscription details from Stripe
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription: any = await getStripe().subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;

        // Update company status
        await prisma.company.update({
          where: { id: companyId },
          data: { status: "ACTIVE" },
        });

        // Update or create subscription
        await prisma.subscription.upsert({
          where: { companyId },
          create: {
            companyId,
            status: "ACTIVE",
            planName: plan || "basic",
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            currentPeriodStartsAt: new Date(subscription.current_period_start * 1000),
            currentPeriodEndsAt: new Date(subscription.current_period_end * 1000),
          },
          update: {
            status: "ACTIVE",
            planName: plan || "basic",
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            currentPeriodStartsAt: new Date(subscription.current_period_start * 1000),
            currentPeriodEndsAt: new Date(subscription.current_period_end * 1000),
          },
        });

        // Activate specific module if requested
        if (moduleKey) {
          await prisma.companyModule.update({
            where: { companyId_moduleKey: { companyId, moduleKey } },
            data: { active: true, activatedAt: new Date() },
          });
        }

        console.log(`✅ Subscription activated for company ${companyId}`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedSub: any = sub;
        const company = await prisma.company.findFirst({
          where: { stripeCustomerId: sub.customer as string },
        });

        if (!company) break;

        const status = sub.status === "active" ? "ACTIVE" : "SUSPENDED";

        await prisma.company.update({
          where: { id: company.id },
          data: { status },
        });

        await prisma.subscription.update({
          where: { companyId: company.id },
          data: {
            status,
            currentPeriodStartsAt: new Date(updatedSub.current_period_start * 1000),
            currentPeriodEndsAt: new Date(updatedSub.current_period_end * 1000),
          },
        });

        console.log(`🔄 Subscription updated for company ${company.id}: ${status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const deletedSub = event.data.object;
        const deletedCompany = await prisma.company.findFirst({
          where: { stripeCustomerId: deletedSub.customer as string },
        });

        if (!deletedCompany) break;

        await prisma.company.update({
          where: { id: deletedCompany.id },
          data: { status: "CANCELLED" },
        });

        await prisma.subscription.update({
          where: { companyId: deletedCompany.id },
          data: { status: "CANCELLED" },
        });

        // Deactivate all modules EXCEPT core (customers must always be active)
        await prisma.companyModule.updateMany({
          where: {
            companyId: deletedCompany.id,
            moduleKey: { notIn: CORE_MODULES.map((m) => m.key) },
          },
          data: { active: false, deactivatedAt: new Date() },
        });

        console.log(`❌ Subscription cancelled for company ${deletedCompany.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const failedCompany = await prisma.company.findFirst({
          where: { stripeCustomerId: invoice.customer as string },
        });

        if (failedCompany) {
          console.log(`⚠️ Payment failed for company ${failedCompany.id}`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
