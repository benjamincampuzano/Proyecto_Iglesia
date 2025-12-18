-- AlterTable
ALTER TABLE "Cell" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Convention" ADD COLUMN     "liderDoceIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "ConventionRegistration" ADD COLUMN     "needsAccommodation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsTransport" BOOLEAN NOT NULL DEFAULT false;
