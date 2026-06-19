-- AlterTable: Add status and error columns to StripeWebhookEvent
ALTER TABLE "stripe_webhook_events" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PROCESSING';
ALTER TABLE "stripe_webhook_events" ADD COLUMN "error" TEXT;

-- Update any existing events to PROCESSED (they were created before the status field)
UPDATE "stripe_webhook_events" SET "status" = 'PROCESSED' WHERE "status" = 'PROCESSING';