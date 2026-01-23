/*
  Warnings:

  - The values [EN_CONSOLIDACION] on the enum `GuestStatus` will be removed. If these variants are still used in the database, this will fail.
  - The `details` column on the `AuditLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `documents` on the `ClassMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `quizLinks` on the `ClassMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `videoLinks` on the `ClassMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `liderDoceIds` on the `Convention` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastLogin` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `leaderId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `liderCelulaId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `liderDoceId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `pastorId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `sex` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,encuentroId]` on the table `EncuentroRegistration` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `action` on the `AuditLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `entityType` on the `AuditLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "HierarchyRole" AS ENUM ('PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'MIEMBRO');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('USER', 'GUEST', 'CELL', 'CONVENTION', 'ENCUENTRO', 'CLASS');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('DOCUMENT', 'VIDEO', 'QUIZ');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RC', 'TI', 'CC', 'CE', 'PP', 'PEP');

-- AlterEnum
BEGIN;
CREATE TYPE "GuestStatus_new" AS ENUM ('NUEVO', 'CONTACTADO', 'CONSOLIDADO', 'GANADO');
ALTER TABLE "Guest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Guest" ALTER COLUMN "status" TYPE "GuestStatus_new" USING ("status"::text::"GuestStatus_new");
ALTER TYPE "GuestStatus" RENAME TO "GuestStatus_old";
ALTER TYPE "GuestStatus_new" RENAME TO "GuestStatus";
DROP TYPE "GuestStatus_old";
ALTER TABLE "Guest" ALTER COLUMN "status" SET DEFAULT 'NUEVO';
COMMIT;

-- DropForeignKey
ALTER TABLE "CellAttendance" DROP CONSTRAINT "CellAttendance_userId_fkey";

-- DropForeignKey
ALTER TABLE "ChurchAttendance" DROP CONSTRAINT "ChurchAttendance_userId_fkey";

-- DropForeignKey
ALTER TABLE "EncuentroRegistration" DROP CONSTRAINT "EncuentroRegistration_guestId_fkey";

-- DropForeignKey
ALTER TABLE "SeminarEnrollment" DROP CONSTRAINT "SeminarEnrollment_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "SeminarEnrollment" DROP CONSTRAINT "SeminarEnrollment_userId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_leaderId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_liderCelulaId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_liderDoceId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_pastorId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT,
DROP COLUMN "action",
ADD COLUMN     "action" "AuditAction" NOT NULL,
DROP COLUMN "entityType",
ADD COLUMN     "entityType" "EntityType" NOT NULL,
DROP COLUMN "details",
ADD COLUMN     "details" JSONB,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "Cell" ADD COLUMN     "cellType" TEXT NOT NULL DEFAULT 'ABIERTA',
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "CellAttendance" ALTER COLUMN "date" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "ChurchAttendance" ALTER COLUMN "date" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "ClassAttendance" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "ClassMaterial" DROP COLUMN "documents",
DROP COLUMN "quizLinks",
DROP COLUMN "videoLinks",
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "Convention" DROP COLUMN "liderDoceIds",
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "startDate" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "endDate" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "ConventionPayment" ALTER COLUMN "date" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "ConventionRegistration" ADD COLUMN     "registeredById" INTEGER,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "Encuentro" ADD COLUMN     "coordinatorId" INTEGER,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "startDate" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "endDate" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "EncuentroClassAttendance" ALTER COLUMN "date" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "EncuentroPayment" ALTER COLUMN "date" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "EncuentroRegistration" ADD COLUMN     "userId" INTEGER,
ALTER COLUMN "guestId" DROP NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "birthDate" TIMESTAMPTZ,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "documentType" "DocumentType",
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sex" "Sex",
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "SeminarEnrollment" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "SeminarModule" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "endDate" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "startDate" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "address",
DROP COLUMN "city",
DROP COLUMN "fullName",
DROP COLUMN "lastLogin",
DROP COLUMN "latitude",
DROP COLUMN "leaderId",
DROP COLUMN "liderCelulaId",
DROP COLUMN "liderDoceId",
DROP COLUMN "longitude",
DROP COLUMN "pastorId",
DROP COLUMN "role",
DROP COLUMN "sex",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "UserHierarchy" (
    "id" SERIAL NOT NULL,
    "parentId" INTEGER NOT NULL,
    "childId" INTEGER NOT NULL,
    "role" "HierarchyRole" NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserHierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "fullName" TEXT NOT NULL,
    "sex" "Sex",
    "documentType" "DocumentType",
    "documentNumber" TEXT,
    "birthDate" TIMESTAMPTZ,
    "address" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "GuestCall" (
    "id" SERIAL NOT NULL,
    "guestId" INTEGER NOT NULL,
    "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observation" TEXT NOT NULL,
    "callerId" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestVisit" (
    "id" SERIAL NOT NULL,
    "guestId" INTEGER NOT NULL,
    "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observation" TEXT NOT NULL,
    "visitorId" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassResource" (
    "id" SERIAL NOT NULL,
    "materialId" INTEGER NOT NULL,
    "type" "ResourceType" NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "ClassResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConventionLeader" (
    "conventionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ConventionLeader_pkey" PRIMARY KEY ("conventionId","userId")
);

-- CreateTable
CREATE TABLE "EncuentroLeader" (
    "encuentroId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "EncuentroLeader_pkey" PRIMARY KEY ("encuentroId","userId")
);

-- CreateIndex
CREATE INDEX "UserHierarchy_role_idx" ON "UserHierarchy"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserHierarchy_parentId_childId_key" ON "UserHierarchy"("parentId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_documentType_documentNumber_key" ON "UserProfile"("documentType", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "ClassResource_type_idx" ON "ClassResource"("type");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Cell_leaderId_idx" ON "Cell"("leaderId");

-- CreateIndex
CREATE INDEX "Cell_liderDoceId_idx" ON "Cell"("liderDoceId");

-- CreateIndex
CREATE INDEX "Cell_hostId_idx" ON "Cell"("hostId");

-- CreateIndex
CREATE INDEX "CellAttendance_date_idx" ON "CellAttendance"("date");

-- CreateIndex
CREATE INDEX "CellAttendance_createdAt_idx" ON "CellAttendance"("createdAt");

-- CreateIndex
CREATE INDEX "CellAttendance_status_idx" ON "CellAttendance"("status");

-- CreateIndex
CREATE INDEX "ChurchAttendance_date_idx" ON "ChurchAttendance"("date");

-- CreateIndex
CREATE INDEX "ChurchAttendance_createdAt_idx" ON "ChurchAttendance"("createdAt");

-- CreateIndex
CREATE INDEX "ChurchAttendance_status_idx" ON "ChurchAttendance"("status");

-- CreateIndex
CREATE INDEX "Convention_type_idx" ON "Convention"("type");

-- CreateIndex
CREATE INDEX "Convention_startDate_idx" ON "Convention"("startDate");

-- CreateIndex
CREATE INDEX "ConventionRegistration_status_idx" ON "ConventionRegistration"("status");

-- CreateIndex
CREATE INDEX "ConventionRegistration_createdAt_idx" ON "ConventionRegistration"("createdAt");

-- CreateIndex
CREATE INDEX "Encuentro_type_idx" ON "Encuentro"("type");

-- CreateIndex
CREATE INDEX "Encuentro_startDate_idx" ON "Encuentro"("startDate");

-- CreateIndex
CREATE INDEX "EncuentroRegistration_status_idx" ON "EncuentroRegistration"("status");

-- CreateIndex
CREATE INDEX "EncuentroRegistration_createdAt_idx" ON "EncuentroRegistration"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EncuentroRegistration_userId_encuentroId_key" ON "EncuentroRegistration"("userId", "encuentroId");

-- CreateIndex
CREATE INDEX "Guest_status_idx" ON "Guest"("status");

-- CreateIndex
CREATE INDEX "Guest_createdAt_idx" ON "Guest"("createdAt");

-- CreateIndex
CREATE INDEX "Guest_assignedToId_idx" ON "Guest"("assignedToId");

-- CreateIndex
CREATE INDEX "Guest_invitedById_idx" ON "Guest"("invitedById");

-- CreateIndex
CREATE INDEX "SeminarEnrollment_status_idx" ON "SeminarEnrollment"("status");

-- CreateIndex
CREATE INDEX "SeminarEnrollment_createdAt_idx" ON "SeminarEnrollment"("createdAt");

-- CreateIndex
CREATE INDEX "SeminarEnrollment_moduleId_idx" ON "SeminarEnrollment"("moduleId");

-- CreateIndex
CREATE INDEX "SeminarEnrollment_userId_idx" ON "SeminarEnrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- AddForeignKey
ALTER TABLE "UserHierarchy" ADD CONSTRAINT "UserHierarchy_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHierarchy" ADD CONSTRAINT "UserHierarchy_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestCall" ADD CONSTRAINT "GuestCall_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestCall" ADD CONSTRAINT "GuestCall_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestVisit" ADD CONSTRAINT "GuestVisit_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestVisit" ADD CONSTRAINT "GuestVisit_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurchAttendance" ADD CONSTRAINT "ChurchAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellAttendance" ADD CONSTRAINT "CellAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassResource" ADD CONSTRAINT "ClassResource_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "ClassMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeminarEnrollment" ADD CONSTRAINT "SeminarEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeminarEnrollment" ADD CONSTRAINT "SeminarEnrollment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SeminarModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionLeader" ADD CONSTRAINT "ConventionLeader_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionLeader" ADD CONSTRAINT "ConventionLeader_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionRegistration" ADD CONSTRAINT "ConventionRegistration_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encuentro" ADD CONSTRAINT "Encuentro_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuentroLeader" ADD CONSTRAINT "EncuentroLeader_encuentroId_fkey" FOREIGN KEY ("encuentroId") REFERENCES "Encuentro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuentroLeader" ADD CONSTRAINT "EncuentroLeader_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuentroRegistration" ADD CONSTRAINT "EncuentroRegistration_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuentroRegistration" ADD CONSTRAINT "EncuentroRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
