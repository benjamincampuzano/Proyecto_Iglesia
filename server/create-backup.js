const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createBackup() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupDir = path.join(__dirname, '..', 'backups');
        const backupFile = path.join(backupDir, `backup_${timestamp}.json`);

        // Create backup directory if it doesn't exist
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        console.log('========================================');
        console.log('Creating Database Backup');
        console.log('========================================\n');

        // Fetch all data
        console.log('Fetching users...');
        const users = await prisma.user.findMany({
            include: {
                invitedGuests: true,
                assignedGuests: true,
                ledCells: true,
                hostedCells: true,
                churchAttendances: true,
                cellAttendances: true,
                seminarEnrollments: true,
                classAttendances: true,
                conventionRegistrations: true
            }
        });

        console.log(`Found ${users.length} users`);

        console.log('Fetching guests...');
        const guests = await prisma.guest.findMany();
        console.log(`Found ${guests.length} guests`);

        console.log('Fetching cells...');
        const cells = await prisma.cell.findMany();
        console.log(`Found ${cells.length} cells`);

        // Create backup object
        const backup = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            data: {
                users,
                guests,
                cells
            }
        };

        // Write to file
        fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

        console.log('\n========================================');
        console.log('Backup completed successfully!');
        console.log(`File: ${backupFile}`);
        console.log(`Size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`);
        console.log('========================================\n');

        return backupFile;

    } catch (error) {
        console.error('Error creating backup:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

createBackup();
