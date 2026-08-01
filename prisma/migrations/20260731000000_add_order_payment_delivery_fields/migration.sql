-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PAYMENT_ON_DELIVERY', 'BANK_CARD', 'SBP', 'CRYPTO');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('CDEK_COURIER', 'CDEK_PICKUP', 'OTHER');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('NOT_READY', 'PREPARING', 'HANDED_TO_CARRIER', 'IN_TRANSIT', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "deliveryCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "customerComment" TEXT,
ADD COLUMN     "trackingNumber" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'PAYMENT_ON_DELIVERY',
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'NOT_READY';

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_deliveryStatus_idx" ON "Order"("deliveryStatus");
