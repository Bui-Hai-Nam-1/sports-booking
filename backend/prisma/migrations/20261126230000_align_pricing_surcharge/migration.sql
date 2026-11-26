-- AlterTable
ALTER TABLE "Venue"
ADD COLUMN "videoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "PricingRule"
ALTER COLUMN "pricePerHour" DROP NOT NULL,
ADD COLUMN "increasePercent" INTEGER;
