-- AlterTable: Add stripeSubscriptionItemId to CompanyModule
ALTER TABLE "company_modules" ADD COLUMN "stripeSubscriptionItemId" TEXT;

-- CreateIndex: Unique constraint on stripeSubscriptionItemId
-- Only for non-null values (partial unique index via application logic, Prisma doesn't support partial unique natively)
-- The @unique annotation in Prisma will create a full unique index which allows nulls
CREATE UNIQUE INDEX "company_modules_stripeSubscriptionItemId_key" ON "company_modules"("stripeSubscriptionItemId");

-- AlterTable: Add includedModuleKey to Subscription
ALTER TABLE "subscriptions" ADD COLUMN "includedModuleKey" TEXT;

-- CreateTable: StripeWebhookEvent for idempotency
CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);