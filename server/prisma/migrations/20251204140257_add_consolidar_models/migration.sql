-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENTE', 'AUSENTE');

-- CreateEnum
CREATE TYPE "ClassAttendanceStatus" AS ENUM ('ASISTE', 'AUSENCIA_JUSTIFICADA', 'AUSENCIA_NO_JUSTIFICADA', 'BAJA');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('INSCRITO', 'EN_PROGRESO', 'COMPLETADO', 'ABANDONADO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cellId" INTEGER;

-- CreateTable
CREATE TABLE "Cell" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leaderId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurchAttendance" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChurchAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellAttendance" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cellId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CellAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeminarModule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "moduleNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeminarModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeminarEnrollment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'INSCRITO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeminarEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassAttendance" (
    "id" SERIAL NOT NULL,
    "enrollmentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "classNumber" INTEGER NOT NULL,
    "status" "ClassAttendanceStatus" NOT NULL DEFAULT 'ASISTE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChurchAttendance_date_userId_key" ON "ChurchAttendance"("date", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CellAttendance_date_cellId_userId_key" ON "CellAttendance"("date", "cellId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SeminarModule_moduleNumber_key" ON "SeminarModule"("moduleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SeminarEnrollment_userId_moduleId_key" ON "SeminarEnrollment"("userId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassAttendance_enrollmentId_classNumber_key" ON "ClassAttendance"("enrollmentId", "classNumber");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurchAttendance" ADD CONSTRAINT "ChurchAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellAttendance" ADD CONSTRAINT "CellAttendance_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellAttendance" ADD CONSTRAINT "CellAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeminarEnrollment" ADD CONSTRAINT "SeminarEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeminarEnrollment" ADD CONSTRAINT "SeminarEnrollment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SeminarModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "SeminarEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
