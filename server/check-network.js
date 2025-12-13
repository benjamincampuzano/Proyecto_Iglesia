const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
    try {
        console.log('=== Checking Network Structure ===\n');

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { fullName: { contains: 'Alex', mode: 'insensitive' } },
                    { fullName: { contains: 'Martha', mode: 'insensitive' } },
                    { fullName: { contains: 'Bárbara', mode: 'insensitive' } },
                    { fullName: { contains: 'Benjamin', mode: 'insensitive' } }
                ]
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                leaderId: true,
                leader: {
                    select: {
                        id: true,
                        fullName: true,
                        role: true
                    }
                }
            },
            orderBy: {
                fullName: 'asc'
            }
        });

        users.forEach(user => {
            console.log(`ID: ${user.id} | ${user.fullName}`);
            console.log(`  Role: ${user.role}`);
            console.log(`  Leader ID: ${user.leaderId || 'None'}`);
            if (user.leader) {
                console.log(`  Leader: ${user.leader.fullName} (${user.leader.role})`);
            }
            console.log('');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();
