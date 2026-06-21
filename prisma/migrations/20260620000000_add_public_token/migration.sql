-- Add publicToken column to quotes table
ALTER TABLE "quotes" ADD COLUMN "publicToken" TEXT;

-- Create unique index
CREATE UNIQUE INDEX "quotes_publicToken_key" ON "quotes"("publicToken");
