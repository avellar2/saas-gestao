-- Add quoteId to financial_transactions
ALTER TABLE "financial_transactions" ADD COLUMN "quoteId" TEXT;

-- Add foreign key constraint
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index
CREATE INDEX "financial_transactions_quoteId_idx" ON "financial_transactions"("quoteId");
