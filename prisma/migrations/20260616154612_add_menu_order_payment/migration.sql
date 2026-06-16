-- AlterTable
ALTER TABLE "menu_orders" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "PaymentMethod";
