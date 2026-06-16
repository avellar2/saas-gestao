-- AlterTable: add menuOrderId to FinancialTransaction
ALTER TABLE "financial_transactions" ADD COLUMN "menuOrderId" TEXT;

-- CreateIndex
CREATE INDEX "financial_transactions_menuOrderId_idx" ON "financial_transactions"("menuOrderId");

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_menuOrderId_fkey"
  FOREIGN KEY ("menuOrderId") REFERENCES "menu_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
