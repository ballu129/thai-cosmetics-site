-- AlterTable
ALTER TABLE "Order"
ADD COLUMN     "guestLookupEmailHash" TEXT;

-- CreateIndex
CREATE INDEX "Order_guestLookupEmailHash_idx" ON "Order"("guestLookupEmailHash");
