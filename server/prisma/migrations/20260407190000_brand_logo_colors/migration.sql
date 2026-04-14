-- CreateTable
CREATE TABLE "BrandLogoColor" (
    "id" TEXT NOT NULL,
    "brandLogoId" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,

    CONSTRAINT "BrandLogoColor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandLogoColor_brandLogoId_colorId_key" ON "BrandLogoColor"("brandLogoId", "colorId");

-- AddForeignKey
ALTER TABLE "BrandLogoColor" ADD CONSTRAINT "BrandLogoColor_brandLogoId_fkey" FOREIGN KEY ("brandLogoId") REFERENCES "BrandLogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandLogoColor" ADD CONSTRAINT "BrandLogoColor_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
