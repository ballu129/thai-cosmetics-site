-- CreateEnum
CREATE TYPE "WholesaleRequestStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'CONTACTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "WholesaleRequest" (
    "id" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT,
    "taxId" TEXT,
    "websiteUrl" TEXT,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "businessType" TEXT,
    "preferredContact" TEXT,
    "expectedVolume" TEXT NOT NULL,
    "interestedBrands" TEXT,
    "interestedCategories" TEXT,
    "customerComment" TEXT,
    "adminComment" TEXT,
    "status" "WholesaleRequestStatus" NOT NULL DEFAULT 'NEW',
    "consentAcceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WholesaleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WholesaleRequest_status_idx" ON "WholesaleRequest"("status");

-- CreateIndex
CREATE INDEX "WholesaleRequest_createdAt_idx" ON "WholesaleRequest"("createdAt");

-- CreateIndex
CREATE INDEX "WholesaleRequest_email_idx" ON "WholesaleRequest"("email");

-- CreateIndex
CREATE INDEX "WholesaleRequest_phone_idx" ON "WholesaleRequest"("phone");
