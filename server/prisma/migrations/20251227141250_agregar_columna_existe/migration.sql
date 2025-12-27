-- AlterTable
ALTER TABLE "User" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "_ModuleAuxiliaries" ADD CONSTRAINT "_ModuleAuxiliaries_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ModuleAuxiliaries_AB_unique";
