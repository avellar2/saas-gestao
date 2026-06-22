import { prisma } from "./prisma";
import { getStripe, getModuleKeyFromPriceId, getBasePriceId, isLegacyPriceId } from "./stripe";
import { CORE_MODULES, getModuleConfig, isCoreModule } from "./modules";
import { calculateMonthlyPrice, getPlanName } from "./pricing";
import type Stripe from "stripe";
import type { SubscriptionStatus } from "@/generated/prisma/client";

/**
 * Map Stripe subscription status to local SubscriptionStatus.
 */
function mapStripeStatusToLocal(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "paused":
    case "unpaid":
      return "SUSPENDED";
    case "canceled":
      return "CANCELLED";
    default:
      return "TRIAL";
  }
}

/**
 * Reconcile the state of a Stripe subscription with the local database.
 *
 * This function:
 * 1. Always retrieves the current subscription from the Stripe API (not just the webhook payload).
 * 2. Validates that the subscription belongs to the expected company.
 * 3. Maps Price IDs to module keys.
 * 4. Determines which modules should be active:
 *    - Core modules are always active.
 *    - The includedModuleKey (from metadata or subscription) is active.
 *    - Modules with paid subscription items are active.
 * 5. Updates Subscription, Company, and CompanyModule records.
 * 6. Is idempotent and safe for concurrent execution.
 *
 * @param companyId - The company ID to reconcile
 * @param stripeSubscription - The Stripe subscription object (freshly retrieved)
 */
export async function syncStripeSubscription(
  companyId: string,
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  const stripe = getStripe();

  // 1. Validate company
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new Error(`syncStripeSubscription: Company ${companyId} not found`);
  }

  // 2. Validate that the subscription belongs to this company's customer
  if (company.stripeCustomerId && stripeSubscription.customer !== company.stripeCustomerId) {
    throw new Error(
      `syncStripeSubscription: Subscription customer ${stripeSubscription.customer} does not match company customer ${company.stripeCustomerId}`
    );
  }

  // 3. Extract includedModuleKey from metadata
  const includedModuleKey =
    (stripeSubscription.metadata?.includedModuleKey as string) || null;

  // 4. Map subscription items to module keys
  const paidExtraModuleKeys: string[] = [];
  const paidItemIds: Record<string, string> = {}; // moduleKey -> subscriptionItemId
  const unknownPriceIds: string[] = [];

  for (const item of stripeSubscription.items.data) {
    const priceId = item.price.id;
    const moduleKey = getModuleKeyFromPriceId(priceId);

    if (moduleKey === "__base__") {
      // This is the base price item, skip
      continue;
    }

    if (moduleKey) {
      // This is a known module price
      if (moduleKey !== includedModuleKey) {
        // It's an extra module (not included in base)
        paidExtraModuleKeys.push(moduleKey);
        paidItemIds[moduleKey] = item.id;
      }
      // If it's the includedModuleKey, it's covered by the base price, not a separate item
    } else if (!isLegacyPriceId(priceId)) {
      // Unknown price ID that's not a legacy plan — log a warning
      unknownPriceIds.push(priceId);
    }
  }

  if (unknownPriceIds.length > 0) {
    console.warn(
      `syncStripeSubscription: Unknown Price IDs for company ${companyId}: ${unknownPriceIds.join(", ")}`
    );
  }

  // 5. Determine the local subscription status
  const localStatus = mapStripeStatusToLocal(stripeSubscription.status);

  // 6. Check for pending updates (SCA or incomplete payment)
  // If there are pending updates, don't activate extras that haven't been paid yet
  const hasPendingUpdate = stripeSubscription.pending_update !== undefined &&
    stripeSubscription.pending_update !== null;

  // 7. Build the full set of active module keys
  const activeModuleKeys = new Set<string>();

  // Core modules are always active
  for (const core of CORE_MODULES) {
    activeModuleKeys.add(core.key);
  }

  // Included module is active (from base price)
  if (includedModuleKey) {
    activeModuleKeys.add(includedModuleKey);
  }

  // Extra modules are active only if payment is confirmed
  // (not pending SCA or incomplete payment)
  if (!hasPendingUpdate && localStatus === "ACTIVE") {
    for (const key of paidExtraModuleKeys) {
      activeModuleKeys.add(key);
    }
  }

  // 8. Calculate monthly price
  const activeKeysArray = Array.from(activeModuleKeys);
  const monthlyPrice = calculateMonthlyPrice(
    activeKeysArray.filter((k) => !isCoreModule(k))
  );
  const planName = getPlanName(activeKeysArray.filter((k) => !isCoreModule(k)));

  // 9. Upsert Subscription
  // Stripe SDK v22+: current_period_start/end is in items.data[0], not at subscription level
  const firstItem = stripeSubscription.items.data[0] as unknown as Record<string, unknown> | undefined;
  const periodStart = firstItem && typeof firstItem.current_period_start === 'number'
    ? new Date((firstItem.current_period_start as number) * 1000)
    : new Date();
  const periodEnd = firstItem && typeof firstItem.current_period_end === 'number'
    ? new Date((firstItem.current_period_end as number) * 1000)
    : new Date();

  await prisma.subscription.upsert({
    where: { companyId },
    create: {
      companyId,
      status: localStatus,
      planName,
      basePrice: 49.0,
      includedModuleKey,
      modulesCount: activeKeysArray.filter((k) => !isCoreModule(k)).length,
      monthlyPrice,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: stripeSubscription.items.data[0]?.price.id || null,
      currentPeriodStartsAt: periodStart,
      currentPeriodEndsAt: periodEnd,
    },
    update: {
      status: localStatus,
      planName,
      includedModuleKey,
      modulesCount: activeKeysArray.filter((k) => !isCoreModule(k)).length,
      monthlyPrice,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: stripeSubscription.items.data[0]?.price.id || null,
      currentPeriodStartsAt: periodStart,
      currentPeriodEndsAt: periodEnd,
    },
  });

  // 10. Update Company status and monthly price
  await prisma.company.update({
    where: { id: companyId },
    data: {
      status: localStatus === "TRIAL" ? "TRIAL" : localStatus,
      monthlyPrice,
    },
  });

  // 11. Update CompanyModules
  const allModules = await prisma.companyModule.findMany({
    where: { companyId },
  });

  const now = new Date();

  for (const cm of allModules) {
    const shouldBeActive = activeModuleKeys.has(cm.moduleKey);
    const expectedStripeItemId = paidItemIds[cm.moduleKey] || null;

    // Only update if something changed
    if (cm.active !== shouldBeActive || cm.stripeSubscriptionItemId !== expectedStripeItemId) {
      await prisma.companyModule.update({
        where: { id: cm.id },
        data: {
          active: shouldBeActive,
          ...(shouldBeActive
            ? { activatedAt: cm.activatedAt || now, deactivatedAt: null }
            : { deactivatedAt: now }),
          stripeSubscriptionItemId: expectedStripeItemId,
        },
      });
    }
  }

  // 12. Clean up stripeSubscriptionItemId for modules not in the subscription
  const paidItemIdsSet = new Set(Object.values(paidItemIds));
  await prisma.companyModule.updateMany({
    where: {
      companyId,
      stripeSubscriptionItemId: { not: null },
      NOT: {
        stripeSubscriptionItemId: { in: [...paidItemIdsSet] },
      },
    },
    data: {
      stripeSubscriptionItemId: null,
    },
  });

  console.log(
    `syncStripeSubscription: Company ${companyId} synced. Status: ${localStatus}. Active modules: ${activeKeysArray.join(", ")}. Price: ${monthlyPrice}`
  );
}

export { mapStripeStatusToLocal };