/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `SeminarModule` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('HOMBRE', 'MUJER');

-- CreateEnum
CREATE TYPE "ConventionType" AS ENUM ('FAMILIAS', 'MUJERES', 'JOVENES', 'HOMBRES');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'CANCELLED', 'ATTENDED');

-- CreateEnum
CREATE TYPE "EncuentroType" AS ENUM ('MUJERES', 'HOMBRES', 'JOVENES');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PASTOR';

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_leaderId_fkey";

-- DropIndex
DROP INDEX "SeminarModule_moduleNumber_key";

-- AlterTable
ALTER TABLE "Cell" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "dayOfWeek" TEXT,
ADD COLUMN     "hostId" INTEGER,
ADD COLUMN     "time" TEXT;

-- AlterTable
ALTER TABLE "ClassAttendance" ADD COLUMN     "grade" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SeminarEnrollment" ADD COLUMN     "assignedAuxiliarId" INTEGER,
ADD COLUMN     "assignmentsDone" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "finalGrade" DOUBLE PRECISION,
ADD COLUMN     "finalProjectGrade" DOUBLE PRECISION,
ADD COLUMN     "projectNotes" TEXT;

-- AlterTable
ALTER TABLE "SeminarModule" ADD COLUMN     "code" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "professorId" INTEGER,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'SEMINARIO',
ALTER COLUMN "moduleNumber" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "liderCelulaId" INTEGER,
ADD COLUMN     "liderDoceId" INTEGER,
ADD COLUMN     "pastorId" INTEGER,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "sex" "Sex";

-- CreateTable
CREATE TABLE "Convention" (
    "id" SERIAL NOT NULL,
    "type" "ConventionType" NOT NULL,
    "year" INTEGER NOT NULL,
    "theme" TEXT,
    "cost" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Convention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConventionRegistration" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "conventionId" INTEGER NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "discountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConventionRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConventionPayment" (
    "id" SERIAL NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConventionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encuentro" (
    "id" SERIAL NOT NULL,
    "type" "EncuentroType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cost" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Encuentro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncuentroRegistration" (
    "id" SERIAL NOT NULL,
    "guestId" INTEGER NOT NULL,
    "encuentroId" INTEGER NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "discountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EncuentroRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncuentroPayment" (
    "id" SERIAL NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EncuentroPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncuentroClassAttendance" (
    "id" SERIAL NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "classNumber" INTEGER NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EncuentroClassAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ModuleAuxiliaries" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Convention_type_year_key" ON "Convention"("type", "year");

-- CreateIndex
CREATE UNIQUE INDEX "ConventionRegistration_userId_conventionId_key" ON "ConventionRegistration"("userId", "conventionId");

-- CreateIndex
CREATE UNIQUE INDEX "EncuentroRegistration_guestId_encuentroId_key" ON "EncuentroRegistration"("guestId", "encuentroId");

-- CreateIndex
CREATE UNIQUE INDEX "EncuentroClassAttendance_registrationId_classNumber_key" ON "EncuentroClassAttendance"("registrationId", "classNumber");

-- CreateIndex
CREATE UNIQUE INDEX "_ModuleAuxiliaries_AB_unique" ON "_ModuleAuxiliaries"("A", "B");

-- CreateIndex
CREATE INDEX "_ModuleAuxiliaries_B_index" ON "_ModuleAuxiliaries"("B");

-- CreateIndex
CREATE UNIQUE INDEX "SeminarModule_code_key" ON "SeminarModule"("code");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_pastorId_fkey" FOREIGN KEY ("pastorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_liderDoceId_fkey" FOREIGN KEY ("liderDoceId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_liderCelulaId_fkey" FOREIGN KEY ("liderCelulaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeminarModule" ADD CONSTRAINT "SeminarModule_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeminarEnrollment" ADD CONSTRAINT "SeminarEnrollment_assignedAuxiliarId_fkey" FOREIGN KEY ("assignedAuxiliarId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionRegistration" ADD CONSTRAINT "ConventionRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionRegistration" ADD CONSTRAINT "ConventionRegistration_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionPayment" ADD CONSTRAINT "ConventionPayment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "ConventionRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuentroRegistration" ADD CONSTRAINT "EncuentroRegistration_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuentroRegistration" ADD CONSTRAINT "EncuentroRegistration_encuentroId_fkey" FOREIGN KEY ("encuentroId") REFERENCES "Encuentro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuentroPayment" ADD CONSTRAINT "EncuentroPayment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EncuentroRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuentroClassAttendance" ADD CONSTRAINT "EncuentroClassAttendance_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EncuentroRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModuleAuxiliaries" ADD CONSTRAINT "_ModuleAuxiliaries_A_fkey" FOREIGN KEY ("A") REFERENCES "SeminarModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModuleAuxiliaries" ADD CONSTRAINT "_ModuleAuxiliaries_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
