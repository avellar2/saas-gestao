import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { syncStripeSubscription, mapStripeStatusToLocal } from "@/lib/stripe-sync";
import { CORE_MODULES } from "@/lib/modules";
import type Stripe from "stripe";

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events with idempotency.
 *
 * Supported events:
 * - checkout.session.completed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.paid
 * - invoice.payment_failed
 * - invoice.payment_action_required
 */
export async function POST(request: Request) {
  // P17 fix: webhook sempre exige STRIPE_WEBHOOK_SECRET. Sem secret, bloqueia.
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret.length < 16) {
    console.error("[STRIPE] STRIPE_WEBHOOK_SECRET não configurado. Webhook bloqueado.");
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET não configurado." },
      { status: 503 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: check if this event has already been processed or is being processed
  const existingEvent = await prisma.stripeWebhookEvent.findUnique({
    where: { id: event.id },
  });

  if (existingEvent) {
    if (existingEvent.status === "PROCESSED") {
      // Already successfully processed, return success
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (existingEvent.status === "PROCESSING") {
      // Another instance is processing this event — tell Stripe to retry later
      return NextResponse.json(
        { error: "Event is being processed" },
        { status: 409 }
      );
    }
    if (existingEvent.status === "FAILED") {
      // Previous attempt failed — reprocess by deleting the old record
      await prisma.stripeWebhookEvent.delete({
        where: { id: event.id },
      });
      // Fall through to create a new record and process
    }
  }

  // Record the event as PROCESSING before handling to prevent race conditions
  await prisma.stripeWebhookEvent.create({
    data: {
      id: event.id,
      type: event.type,
      status: "PROCESSING",
    },
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkout = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(checkout);
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreatedOrUpdate(subscription);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreatedOrUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const deletedSubscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(deletedSubscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case "invoice.payment_action_required": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentActionRequired(invoice);
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    // Mark event as successfully processed
    await prisma.stripeWebhookEvent.update({
      where: { id: event.id },
      data: { status: "PROCESSED" },
    });
  } catch (error) {
    console.error(`Stripe webhook handler error for ${event.type}:`, error);

    // Mark event as failed so it can be retried
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await prisma.stripeWebhookEvent.update({
      where: { id: event.id },
      data: { status: "FAILED", error: errorMessage },
    });

    // Return 500 so Stripe retries the webhook
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(checkout: Stripe.Checkout.Session) {
  const companyId = checkout.metadata?.companyId;
  if (!companyId) {
    console.error("checkout.session.completed: No companyId in metadata");
    return;
  }

  // Validate payment status
  if (checkout.payment_status !== "paid") {
    console.log(`checkout.session.completed: Payment status is ${checkout.payment_status}, not paid. Skipping activation.`);
    return;
  }

  // Get the subscription from Stripe directly (not from the event payload)
  const subscriptionId = checkout.subscription as string;
  if (!subscriptionId) {
    console.error("checkout.session.completed: No subscription ID in checkout session");
    return;
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Find the company and link the Stripe customer if needed
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    console.error(`checkout.session.completed: Company ${companyId} not found`);
    return;
  }

  // Link the Stripe customer to the company if not already linked
  const stripeCustomerId = checkout.customer as string;
  if (stripeCustomerId && company.stripeCustomerId !== stripeCustomerId) {
    // Verify this customer doesn't belong to another company
    const existingCompany = await prisma.company.findUnique({
      where: { stripeCustomerId },
    });

    if (existingCompany && existingCompany.id !== companyId) {
      console.error(
        `checkout.session.completed: Customer ${stripeCustomerId} already belongs to company ${existingCompany.id}`
      );
      return;
    }

    await prisma.company.update({
      where: { id: companyId },
      data: { stripeCustomerId },
    });
  }

  // Determine if this is a legacy or modular checkout
  const isLegacy = checkout.metadata?.legacy === "true";
  const includedModuleKey = checkout.metadata?.includedModuleKey || null;

  if (isLegacy) {
    // Legacy checkout: use the old flow
    const plan = checkout.metadata?.plan || "basic";
    const moduleKey = checkout.metadata?.moduleKey || null;

    // Update company status
    await prisma.company.update({
      where: { id: companyId },
      data: { status: "ACTIVE" },
    });

    // Upsert subscription with legacy plan info
    // Stripe SDK v2026 types don't expose current_period_start/end directly
    const subAny = subscription as unknown as Record<string, unknown>;
    const periodStart = typeof subAny.current_period_start === 'number'
      ? new Date((subAny.current_period_start as number) * 1000)
      : new Date();
    const periodEnd = typeof subAny.current_period_end === 'number'
      ? new Date((subAny.current_period_end as number) * 1000)
      : new Date();

    await prisma.subscription.upsert({
      where: { companyId },
      create: {
        companyId,
        status: "ACTIVE",
        planName: plan,
        basePrice: 49.0,
        modulesCount: plan === "pro" ? 10 : 3,
        monthlyPrice: plan === "pro" ? 99 : 49,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: subscription.items.data[0]?.price.id,
        currentPeriodStartsAt: periodStart,
        currentPeriodEndsAt: periodEnd,
      },
      update: {
        status: "ACTIVE",
        planName: plan,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: subscription.items.data[0]?.price.id,
        currentPeriodStartsAt: periodStart,
        currentPeriodEndsAt: periodEnd,
      },
    });

    // Activate specific module if provided
    if (moduleKey) {
      await prisma.companyModule.update({
        where: { companyId_moduleKey: { companyId, moduleKey } },
        data: { active: true, activatedAt: new Date() },
      }).catch(() => {
        console.warn(`Module ${moduleKey} not found for company ${companyId}`);
      });
    }

    console.log(`Legacy checkout completed for company ${companyId}, plan: ${plan}`);
  } else {
    // Modular checkout: use the reconciliation function
    // Set includedModuleKey on the subscription metadata if present
    if (includedModuleKey) {
      // The includedModuleKey is in the checkout metadata
      // We need to store it on the subscription for future reconciliation
      try {
        await stripe.subscriptions.update(subscriptionId, {
          metadata: {
            ...subscription.metadata,
            includedModuleKey,
          },
        });
      } catch (err) {
        console.warn(`Failed to update subscription metadata: ${err}`);
      }

      // Re-read the subscription with updated metadata
      const updatedSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncStripeSubscription(companyId, updatedSubscription);
    } else {
      // No includedModuleKey in metadata — reconcile as-is
      await syncStripeSubscription(companyId, subscription);
    }
  }

  console.log(`✅ Checkout completed for company ${companyId}`);
}

async function handleSubscriptionCreatedOrUpdate(subscription: Stripe.Subscription) {
  const stripeCustomerId = subscription.customer as string;

  // Find the company by Stripe customer ID
  const company = await prisma.company.findUnique({
    where: { stripeCustomerId },
  });

  if (!company) {
    console.warn(`subscription.created/updated: No company found for customer ${stripeCustomerId}`);
    return;
  }

  // Always retrieve the latest subscription state from Stripe
  const stripe = getStripe();
  const freshSubscription = await stripe.subscriptions.retrieve(subscription.id);

  // Reconcile using the fresh data
  await syncStripeSubscription(company.id, freshSubscription);

  console.log(`🔄 Subscription ${subscription.status} for company ${company.id}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const stripeCustomerId = subscription.customer as string;

  const company = await prisma.company.findUnique({
    where: { stripeCustomerId },
  });

  if (!company) {
    console.warn(`subscription.deleted: No company found for customer ${stripeCustomerId}`);
    return;
  }

  // Set company status to CANCELLED
  await prisma.company.update({
    where: { id: company.id },
    data: { status: "CANCELLED" },
  });

  // Set subscription status to CANCELLED
  await prisma.subscription.update({
    where: { companyId: company.id },
    data: { status: "CANCELLED" },
  }).catch(() => {
    // Subscription may not exist
  });

  // Deactivate all non-core modules
  await prisma.companyModule.updateMany({
    where: {
      companyId: company.id,
      moduleKey: { notIn: CORE_MODULES.map((m) => m.key) },
    },
    data: {
      active: false,
      deactivatedAt: new Date(),
      stripeSubscriptionItemId: null,
    },
  });

  console.log(`❌ Subscription cancelled for company ${company.id}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const stripeCustomerId = invoice.customer as string;

  const company = await prisma.company.findUnique({
    where: { stripeCustomerId },
  });

  if (!company) {
    console.warn(`invoice.paid: No company found for customer ${stripeCustomerId}`);
    return;
  }

  // If the company has a subscription, reconcile
  const subscription = await prisma.subscription.findUnique({
    where: { companyId: company.id },
  });

  if (subscription?.stripeSubscriptionId) {
    const stripe = getStripe();
    const freshSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );
    await syncStripeSubscription(company.id, freshSubscription);
  }

  console.log(`💰 Invoice paid for company ${company.id}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeCustomerId = invoice.customer as string;

  const company = await prisma.company.findUnique({
    where: { stripeCustomerId },
  });

  if (!company) {
    console.warn(`invoice.payment_failed: No company found for customer ${stripeCustomerId}`);
    return;
  }

  // Log a warning but don't suspend immediately
  // Stripe will retry the payment automatically
  console.warn(`⚠️ Payment failed for company ${company.id}. Invoice: ${invoice.id}`);

  // If the subscription is past_due, suspend the company
  // Stripe SDK v2026 types don't expose invoice.subscription directly
  const invoiceAny = invoice as unknown as Record<string, unknown>;
  const subscriptionId = typeof invoiceAny.subscription === 'string'
    ? invoiceAny.subscription as string
    : (invoiceAny.subscription as { id?: string } | null)?.id ?? null;

  if (subscriptionId) {
    const stripe = getStripe();
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      if (subscription.status === "past_due" || subscription.status === "unpaid") {
        await prisma.company.update({
          where: { id: company.id },
          data: { status: "SUSPENDED" },
        });

        await prisma.subscription.update({
          where: { companyId: company.id },
          data: { status: "SUSPENDED" },
        }).catch(() => {});

        console.log(`🔒 Company ${company.id} suspended due to payment failure`);
      }
    } catch (err) {
      console.error(`Error checking subscription status for company ${company.id}:`, err);
    }
  }
}

async function handleInvoicePaymentActionRequired(invoice: Stripe.Invoice) {
  const stripeCustomerId = invoice.customer as string;

  const company = await prisma.company.findUnique({
    where: { stripeCustomerId },
  });

  if (!company) {
    return;
  }

  // SCA required — the customer needs to authenticate the payment
  // Don't suspend or deactivate — wait for the payment to be confirmed or failed
  const invoiceId = typeof invoice.id === 'string' ? invoice.id : 'unknown';
  console.log(
    `🔐 Payment action required for company ${company.id}. Invoice: ${invoiceId}. Customer needs to authenticate.`
  );

  // Note: In a production system, you would send an email notification here
  // asking the customer to complete the payment authentication.
}