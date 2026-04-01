-- CreateTable
CREATE TABLE "BrandLogo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "widthCm" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BrandLogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandLogoPlacement" (
    "id" TEXT NOT NULL,
    "brandLogoId" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,

    CONSTRAINT "BrandLogoPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandLogo_slug_key" ON "BrandLogo"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BrandLogo_code_key" ON "BrandLogo"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BrandLogoPlacement_brandLogoId_placementId_key" ON "BrandLogoPlacement"("brandLogoId", "placementId");

-- AddForeignKey
ALTER TABLE "BrandLogoPlacement" ADD CONSTRAINT "BrandLogoPlacement_brandLogoId_fkey" FOREIGN KEY ("brandLogoId") REFERENCES "BrandLogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandLogoPlacement" ADD CONSTRAINT "BrandLogoPlacement_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "Placement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
