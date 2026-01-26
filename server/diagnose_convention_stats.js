const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
    console.log('--- DIAGNOSING CONVENTION STATS ---');
    try {
        const totalConventions = await prisma.convention.count();
        console.log('Total Conventions:', totalConventions);

        const latestConventions = await prisma.convention.findMany({
            take: 5,
            orderBy: { startDate: 'desc' }
        });
        console.log('Latest 5 Conventions:', latestConventions.map(c => ({ id: c.id, type: c.type, year: c.year, startDate: c.startDate })));

        const totalRegs = await prisma.conventionRegistration.count();
        console.log('Total Convention Registrations:', totalRegs);

        const activeRegs = await prisma.conventionRegistration.count({
            where: { status: { not: 'CANCELLED' } }
        });
        console.log('Non-cancelled Registrations:', activeRegs);

        // Simulate the controller query for ADMIN
        const end = new Date();
        const start = new Date();
        start.setFullYear(start.getFullYear() - 5);

        console.log(`Checking range: ${start.toISOString()} to ${end.toISOString()}`);

        const regsInRange = await prisma.conventionRegistration.findMany({
            where: {
                status: { not: 'CANCELLED' },
                convention: {
                    startDate: { gte: start }
                }
            }
        });
        console.log('Registrations in default 5-year range:', regsInRange.length);

        if (regsInRange.length > 0) {
            const firstReg = await prisma.conventionRegistration.findFirst({
                where: {
                    status: { not: 'CANCELLED' },
                    convention: {
                        startDate: { gte: start, lte: end }
                    }
                },
                include: { user: true }
            });
            console.log('Sample registration user role:', firstReg.user.role);
        }

    } catch (e) {
        console.error('Diagnostic error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

diagnose();
