-- Add Stripe fields to Company
ALTER TABLE "companies" ADD COLUMN "stripeCustomerId" TEXT;
CREATE UNIQUE INDEX "companies_stripeCustomerId_key" ON "companies"("stripeCustomerId");

-- Add Stripe fields to Subscription
ALTER TABLE "subscriptions" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN "stripePriceId" TEXT;
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");
