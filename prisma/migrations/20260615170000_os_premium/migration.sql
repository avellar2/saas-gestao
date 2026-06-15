-- OS Premium: novos enums, campos e status expandidos
-- Passo a passo seguro com CASE na conversão do enum

-- 1. Criar novos enums (ServiceOrderPriority, PaymentMethod)
CREATE TYPE "ServiceOrderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'PIX', 'CARD', 'TRANSFER', 'OTHER');

-- 2. Alterar o enum ServiceOrderStatus com mapeamento inline
--    OPENED → RECEIVED, FINISHED → READY, demais mantidos
BEGIN;
CREATE TYPE "ServiceOrderStatus_new" AS ENUM ('RECEIVED', 'DIAGNOSIS', 'WAITING_APPROVAL', 'WAITING_PARTS', 'IN_PROGRESS', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."service_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "service_orders" ALTER COLUMN "status" TYPE "ServiceOrderStatus_new" USING (
  CASE "status"::text
    WHEN 'OPENED' THEN 'RECEIVED'::text
    WHEN 'FINISHED' THEN 'READY'::text
    ELSE "status"::text
  END::"ServiceOrderStatus_new"
);
ALTER TYPE "ServiceOrderStatus" RENAME TO "ServiceOrderStatus_old";
ALTER TYPE "ServiceOrderStatus_new" RENAME TO "ServiceOrderStatus";
DROP TYPE IF EXISTS "public"."ServiceOrderStatus_old";
ALTER TABLE "service_orders" ALTER COLUMN "status" SET DEFAULT 'RECEIVED';
COMMIT;

-- 3. Adicionar novas colunas na tabela service_orders
ALTER TABLE "service_orders" ADD COLUMN     "accessories" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "customerNotes" TEXT,
ADD COLUMN     "equipmentBrand" TEXT,
ADD COLUMN     "equipmentModel" TEXT,
ADD COLUMN     "equipmentName" TEXT,
ADD COLUMN     "expectedDeliveryDate" TIMESTAMP(3),
ADD COLUMN     "finalAmount" DECIMAL(10,2),
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "priority" "ServiceOrderPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "publicToken" TEXT,
ADD COLUMN     "receivedAt" TIMESTAMP(3),
ADD COLUMN     "serialNumber" TEXT,
ADD COLUMN     "technicianId" TEXT,
ADD COLUMN     "warrantyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "warrantyEndDate" TIMESTAMP(3),
ADD COLUMN     "warrantyStartDate" TIMESTAMP(3),
ADD COLUMN     "warrantyTerms" TEXT;

-- 5. Popular code retroativamente para OS existentes
UPDATE "service_orders" SET "code" = concat('OS-', LPAD("number"::text, 4, '0')) WHERE "code" IS NULL;

-- 6. Popular receivedAt retroativamente
UPDATE "service_orders" SET "receivedAt" = "openedAt" WHERE "receivedAt" IS NULL AND "openedAt" IS NOT NULL;

-- 7. Criar indexes
CREATE UNIQUE INDEX "service_orders_publicToken_key" ON "service_orders"("publicToken");
CREATE INDEX "service_orders_technicianId_idx" ON "service_orders"("technicianId");
CREATE UNIQUE INDEX "service_orders_companyId_code_key" ON "service_orders"("companyId", "code");

-- 8. AddForeignKey para technicianId
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;