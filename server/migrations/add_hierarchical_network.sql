-- Migration: Add Hierarchical Network Structure
-- Date: 2025-12-12
-- Description: Adds PASTOR role and hierarchical fields (pastorId, liderDoceId, liderCelulaId) to User table

-- Step 1: Add PASTOR to Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PASTOR';

-- Step 2: Add new hierarchical columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pastorId" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "liderDoceId" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "liderCelulaId" INTEGER;

-- Step 3: Add foreign key constraints
ALTER TABLE "User" ADD CONSTRAINT "User_pastorId_fkey" 
  FOREIGN KEY ("pastorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User" ADD CONSTRAINT "User_liderDoceId_fkey" 
  FOREIGN KEY ("liderDoceId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User" ADD CONSTRAINT "User_liderCelulaId_fkey" 
  FOREIGN KEY ("liderCelulaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 4: Update existing leaderId constraint to NO ACTION (for compatibility during migration)
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_leaderId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_leaderId_fkey" 
  FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Migration complete
-- Next step: Run data migration script to populate new fields from leaderId
