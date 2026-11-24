CREATE TYPE "VenueStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "PricingType" AS ENUM ('STANDARD', 'WEEKEND', 'PEAK');

ALTER TABLE "Venue"
  ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "videoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "sportTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "status" "VenueStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Court"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "VenueOpeningHour" (
  "id" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "opensAt" TEXT NOT NULL,
  "closesAt" TEXT NOT NULL,
  "isClosed" BOOLEAN NOT NULL DEFAULT false,
  "venueId" TEXT NOT NULL,
  CONSTRAINT "VenueOpeningHour_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PricingRule" (
  "id" TEXT NOT NULL,
  "type" "PricingType" NOT NULL,
  "pricePerHour" DECIMAL(12,2) NOT NULL,
  "weekday" INTEGER,
  "startsAt" TEXT NOT NULL,
  "endsAt" TEXT NOT NULL,
  "courtId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaintenanceBlock" (
  "id" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "courtId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VenueOpeningHour_venueId_weekday_key" ON "VenueOpeningHour"("venueId", "weekday");
CREATE INDEX "PricingRule_courtId_type_weekday_idx" ON "PricingRule"("courtId", "type", "weekday");
CREATE INDEX "MaintenanceBlock_courtId_startAt_endAt_idx" ON "MaintenanceBlock"("courtId", "startAt", "endAt");

ALTER TABLE "VenueOpeningHour" ADD CONSTRAINT "VenueOpeningHour_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_courtId_fkey"
  FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceBlock" ADD CONSTRAINT "MaintenanceBlock_courtId_fkey"
  FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;
