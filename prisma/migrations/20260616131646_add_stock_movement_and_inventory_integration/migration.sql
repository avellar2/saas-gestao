-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "StockMovementReason" AS ENUM ('SERVICE_ORDER', 'PURCHASE', 'SALE', 'MANUAL_ADJUSTMENT', 'RETURN', 'LOSS');

-- AlterTable
ALTER TABLE "financial_transactions" ADD COLUMN     "serviceOrderId" TEXT;

-- AlterTable
ALTER TABLE "service_order_items" ADD COLUMN     "productId" TEXT;

-- AlterTable
ALTER TABLE "service_orders" ADD COLUMN     "inventoryDeductedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "serviceOrderId" TEXT,
    "type" "StockMovementType" NOT NULL,
    "reason" "StockMovementReason" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "previousQuantity" DECIMAL(10,2) NOT NULL,
    "newQuantity" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_movements_companyId_idx" ON "stock_movements"("companyId");

-- CreateIndex
CREATE INDEX "stock_movements_productId_idx" ON "stock_movements"("productId");

-- CreateIndex
CREATE INDEX "stock_movements_serviceOrderId_idx" ON "stock_movements"("serviceOrderId");

-- CreateIndex
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");

-- CreateIndex
CREATE INDEX "financial_transactions_serviceOrderId_idx" ON "financial_transactions"("serviceOrderId");

-- CreateIndex
CREATE INDEX "service_order_items_productId_idx" ON "service_order_items"("productId");

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
