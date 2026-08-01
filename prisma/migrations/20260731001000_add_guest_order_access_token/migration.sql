-- AlterTable
ALTER TABLE "Order"
ADD COLUMN     "guestAccessTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_guestAccessTokenHash_key" ON "Order"("guestAccessTokenHash");

-- CreateIndex
CREATE INDEX "Order_guestAccessTokenHash_idx" ON "Order"("guestAccessTokenHash");
