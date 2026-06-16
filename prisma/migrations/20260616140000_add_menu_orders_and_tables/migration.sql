-- CreateEnum
CREATE TYPE "MenuOrderType" AS ENUM ('TABLE', 'TAKEAWAY');

-- CreateEnum
CREATE TYPE "MenuOrderStatus" AS ENUM ('RECEIVED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "activity_logs" ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "userName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "slug" TEXT;

-- CreateTable
CREATE TABLE "restaurant_tables" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_orders" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tableId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "orderType" "MenuOrderType" NOT NULL,
    "status" "MenuOrderStatus" NOT NULL DEFAULT 'RECEIVED',
    "total" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "orderNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "priceSnapshot" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "menu_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_tables_token_key" ON "restaurant_tables"("token");

-- CreateIndex
CREATE INDEX "restaurant_tables_companyId_idx" ON "restaurant_tables"("companyId");

-- CreateIndex
CREATE INDEX "restaurant_tables_token_idx" ON "restaurant_tables"("token");

-- CreateIndex
CREATE INDEX "menu_orders_companyId_idx" ON "menu_orders"("companyId");

-- CreateIndex
CREATE INDEX "menu_orders_status_idx" ON "menu_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "menu_orders_companyId_orderNumber_key" ON "menu_orders"("companyId", "orderNumber");

-- CreateIndex
CREATE INDEX "menu_order_items_orderId_idx" ON "menu_order_items"("orderId");

-- CreateIndex
CREATE INDEX "menu_order_items_menuItemId_idx" ON "menu_order_items"("menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- AddForeignKey
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_orders" ADD CONSTRAINT "menu_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_orders" ADD CONSTRAINT "menu_orders_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "restaurant_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_order_items" ADD CONSTRAINT "menu_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "menu_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_order_items" ADD CONSTRAINT "menu_order_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
