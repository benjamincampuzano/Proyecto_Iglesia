-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'PROFESOR';
ALTER TYPE "Role" ADD VALUE 'AUXILIAR';

-- CreateTable
CREATE TABLE "ClassMaterial" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "classNumber" INTEGER NOT NULL,
    "description" TEXT,
    "documents" TEXT[],
    "videoLinks" TEXT[],
    "quizLinks" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassMaterial_moduleId_classNumber_key" ON "ClassMaterial"("moduleId", "classNumber");

-- AddForeignKey
ALTER TABLE "ClassMaterial" ADD CONSTRAINT "ClassMaterial_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SeminarModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
