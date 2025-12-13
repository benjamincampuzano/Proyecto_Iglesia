const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
    try {
        console.log('========================================');
        console.log('Running Database Migration');
        console.log('========================================\n');

        console.log('Step 1: Adding PASTOR to Role enum...');
        await prisma.$executeRaw`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PASTOR'`;
        console.log('✓ PASTOR role added\n');

        console.log('Step 2: Adding pastorId column...');
        await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pastorId" INTEGER`;
        console.log('✓ pastorId column added\n');

        console.log('Step 3: Adding liderDoceId column...');
        await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "liderDoceId" INTEGER`;
        console.log('✓ liderDoceId column added\n');

        console.log('Step 4: Adding liderCelulaId column...');
        await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "liderCelulaId" INTEGER`;
        console.log('✓ liderCelulaId column added\n');

        console.log('Step 5: Adding foreign key constraints...');

        // Drop existing constraints if they exist
        await prisma.$executeRaw`ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_pastorId_fkey"`;
        await prisma.$executeRaw`ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_liderDoceId_fkey"`;
        await prisma.$executeRaw`ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_liderCelulaId_fkey"`;

        // Add new constraints
        await prisma.$executeRaw`ALTER TABLE "User" ADD CONSTRAINT "User_pastorId_fkey" FOREIGN KEY ("pastorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`;
        await prisma.$executeRaw`ALTER TABLE "User" ADD CONSTRAINT "User_liderDoceId_fkey" FOREIGN KEY ("liderDoceId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`;
        await prisma.$executeRaw`ALTER TABLE "User" ADD CONSTRAINT "User_liderCelulaId_fkey" FOREIGN KEY ("liderCelulaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`;
        console.log('✓ Foreign key constraints added\n');

        console.log('Step 6: Updating leaderId constraint...');
        await prisma.$executeRaw`ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_leaderId_fkey"`;
        await prisma.$executeRaw`ALTER TABLE "User" ADD CONSTRAINT "User_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`;
        console.log('✓ leaderId constraint updated\n');

        // Verify the changes
        console.log('Verifying schema changes...');
        const result = await prisma.$queryRaw`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'User' 
            AND column_name IN ('pastorId', 'liderDoceId', 'liderCelulaId')
            ORDER BY column_name;
        `;

        console.log('New columns added:');
        console.table(result);

        console.log('\n========================================');
        console.log('Migration Successful!');
        console.log('========================================\n');

    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

runMigration();
