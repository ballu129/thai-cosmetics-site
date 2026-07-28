-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;

-- Migrate existing string categories into Category rows.
INSERT INTO "Category" ("id", "name", "slug", "createdAt", "updatedAt")
SELECT
    'cat_' || md5("name") AS "id",
    "name",
    lower(regexp_replace("name", '\s+', '-', 'g')) || '-' || substr(md5("name"), 1, 8) AS "slug",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT trim("category") AS "name"
    FROM "Product"
    WHERE trim("category") <> ''
) AS "ExistingCategories";

-- Link existing products to the migrated categories.
UPDATE "Product" AS "Product"
SET "categoryId" = "Category"."id"
FROM "Category"
WHERE trim("Product"."category") = "Category"."name";

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_isActive_idx" ON "Category"("isActive");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
