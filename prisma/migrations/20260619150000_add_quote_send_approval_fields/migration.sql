-- CreateTable migration for new enums and columns on quotes

-- CreateEnum
CREATE TYPE "QuoteSendChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'MANUAL');

-- CreateEnum
CREATE TYPE "QuoteApprovalSource" AS ENUM ('ONLINE', 'PHYSICAL');

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN "sentAt" TIMESTAMP(3);
ALTER TABLE "quotes" ADD COLUMN "sentVia" "QuoteSendChannel";
ALTER TABLE "quotes" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "quotes" ADD COLUMN "rejectedAt" TIMESTAMP(3);
ALTER TABLE "quotes" ADD COLUMN "approvalSource" "QuoteApprovalSource";
ALTER TABLE "quotes" ADD COLUMN "approvedByUserId" TEXT;
ALTER TABLE "quotes" ADD COLUMN "approvedByName" TEXT;
ALTER TABLE "quotes" ADD COLUMN "rejectionReason" TEXT;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
