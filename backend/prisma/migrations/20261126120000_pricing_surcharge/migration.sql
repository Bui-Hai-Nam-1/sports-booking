ALTER TABLE "PricingRule"
  ALTER COLUMN "pricePerHour" DROP NOT NULL,
  ADD COLUMN "increasePercent" INTEGER;
