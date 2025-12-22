-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "callObservation" TEXT,
ADD COLUMN     "called" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visitObservation" TEXT,
ADD COLUMN     "visited" BOOLEAN NOT NULL DEFAULT false;
