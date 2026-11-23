-- CreateEnum
CREATE TYPE "OwnerApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "ownerApprovalStatus" "OwnerApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "ownerReviewedAt" TIMESTAMP(3),
ADD COLUMN "ownerReviewedById" TEXT;

-- AlterTable
ALTER TABLE "Venue"
ADD COLUMN "sportTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Court"
ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Match Prisma's @updatedAt behavior while retaining a value for existing rows.
ALTER TABLE "Court" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "VenueOpeningHour" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VenueOpeningHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourtPriceRule" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "pricePerHour" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourtPriceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourtMaintenance" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourtMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Venue_ownerId_isActive_idx" ON "Venue"("ownerId", "isActive");

-- CreateIndex
CREATE INDEX "Court_venueId_isActive_idx" ON "Court"("venueId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "VenueOpeningHour_venueId_dayOfWeek_key" ON "VenueOpeningHour"("venueId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "CourtPriceRule_courtId_dayOfWeek_idx" ON "CourtPriceRule"("courtId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "CourtMaintenance_courtId_startAt_endAt_idx" ON "CourtMaintenance"("courtId", "startAt", "endAt");

-- AddForeignKey
ALTER TABLE "VenueOpeningHour" ADD CONSTRAINT "VenueOpeningHour_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtPriceRule" ADD CONSTRAINT "CourtPriceRule_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtMaintenance" ADD CONSTRAINT "CourtMaintenance_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;
