-- DropIndex
DROP INDEX "Placement_name_key";

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "slug" TEXT;

UPDATE "Collection"
SET "slug" = lower(regexp_replace(coalesce("name", 'collection'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring("id" from 1 for 6)
WHERE "slug" IS NULL;

ALTER TABLE "Collection" ALTER COLUMN "slug" SET NOT NULL;

-- AlterTable
ALTER TABLE "Design" ADD COLUMN     "code" TEXT,
ADD COLUMN     "designCategoryId" TEXT;

UPDATE "Design"
SET "code" = 'LEG' || upper(substring("id" from 1 for 2)),
    "designCategoryId" = '00000000-0000-0000-0000-000000000001'
WHERE "code" IS NULL OR "designCategoryId" IS NULL;

ALTER TABLE "Design" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "Design" ALTER COLUMN "designCategoryId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DesignTransferSize" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "widthCm" SET NOT NULL,
ALTER COLUMN "heightCm" SET NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "configurationCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "customAssetUrlsJson" TEXT,
ADD COLUMN     "customizationMode" TEXT NOT NULL DEFAULT 'brand_design',
ADD COLUMN     "layoutSnapshotJson" TEXT,
ADD COLUMN     "logoPlacementCode" TEXT,
ADD COLUMN     "printPlacementCode" TEXT,
ADD COLUMN     "uploadTemplateId" TEXT;

-- AlterTable
ALTER TABLE "Placement" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "kind" TEXT,
ADD COLUMN     "surface" TEXT;

UPDATE "Placement"
SET "code" = CASE
    WHEN lower("name") LIKE '%front%' THEN 'LF'
    WHEN lower("name") LIKE '%back%' THEN 'LC'
    WHEN lower("name") LIKE '%sleeve%' THEN 'IBR'
    ELSE 'PLC' || upper(substring("id" from 1 for 3))
  END,
  "kind" = CASE
    WHEN lower("name") LIKE '%logo%' THEN 'logo'
    ELSE 'print'
  END,
  "surface" = CASE
    WHEN lower("name") LIKE '%front%' THEN 'front'
    WHEN lower("name") LIKE '%back%' THEN 'back'
    WHEN lower("name") LIKE '%sleeve%' THEN 'sleeve'
    ELSE 'front'
  END
WHERE "code" IS NULL OR "kind" IS NULL OR "surface" IS NULL;

ALTER TABLE "Placement" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "Placement" ALTER COLUMN "kind" SET NOT NULL;
ALTER TABLE "Placement" ALTER COLUMN "surface" SET NOT NULL;

-- DropTable
DROP TABLE "LogoTransferStock";

-- CreateTable
CREATE TABLE "PrintArea" (
    "id" TEXT NOT NULL,
    "garmentModelId" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,
    "xPct" DOUBLE PRECISION NOT NULL,
    "yPct" DOUBLE PRECISION NOT NULL,
    "widthPct" DOUBLE PRECISION NOT NULL,
    "heightPct" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PrintArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DesignCategory_pkey" PRIMARY KEY ("id")
);

-- Create a fallback category for legacy brand designs if old rows exist
INSERT INTO "DesignCategory" ("id", "name", "slug", "code", "active")
SELECT '00000000-0000-0000-0000-000000000001', 'Legacy', 'legacy', 'LEG', true
WHERE NOT EXISTS (
    SELECT 1 FROM "DesignCategory" WHERE "slug" = 'legacy'
);

-- CreateTable
CREATE TABLE "DesignPlacement" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,

    CONSTRAINT "DesignPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customizationType" TEXT NOT NULL,
    "description" TEXT,
    "requiredImageCount" INTEGER NOT NULL,
    "allowsText" BOOLEAN NOT NULL DEFAULT false,
    "textLabel" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "placementId" TEXT NOT NULL,
    "previewImageUrl" TEXT,

    CONSTRAINT "UploadTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadTemplateSize" (
    "id" TEXT NOT NULL,
    "uploadTemplateId" TEXT NOT NULL,
    "sizeCode" TEXT NOT NULL,
    "widthCm" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "extraPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UploadTemplateSize_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrintArea_garmentModelId_placementId_key" ON "PrintArea"("garmentModelId", "placementId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignCategory_slug_key" ON "DesignCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DesignCategory_code_key" ON "DesignCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DesignPlacement_designId_placementId_key" ON "DesignPlacement"("designId", "placementId");

-- CreateIndex
CREATE UNIQUE INDEX "UploadTemplate_code_key" ON "UploadTemplate"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UploadTemplate_slug_key" ON "UploadTemplate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UploadTemplateSize_uploadTemplateId_sizeCode_key" ON "UploadTemplateSize"("uploadTemplateId", "sizeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Design_code_key" ON "Design"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Placement_code_key" ON "Placement"("code");

-- AddForeignKey
ALTER TABLE "PrintArea" ADD CONSTRAINT "PrintArea_garmentModelId_fkey" FOREIGN KEY ("garmentModelId") REFERENCES "GarmentModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintArea" ADD CONSTRAINT "PrintArea_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "Placement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Design" ADD CONSTRAINT "Design_designCategoryId_fkey" FOREIGN KEY ("designCategoryId") REFERENCES "DesignCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignPlacement" ADD CONSTRAINT "DesignPlacement_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignPlacement" ADD CONSTRAINT "DesignPlacement_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "Placement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadTemplate" ADD CONSTRAINT "UploadTemplate_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "Placement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadTemplateSize" ADD CONSTRAINT "UploadTemplateSize_uploadTemplateId_fkey" FOREIGN KEY ("uploadTemplateId") REFERENCES "UploadTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_uploadTemplateId_fkey" FOREIGN KEY ("uploadTemplateId") REFERENCES "UploadTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

