const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const roles = await prisma.user.groupBy({
            by: ['role'],
            _count: { _all: true }
        });
        console.log('Roles distribution:', JSON.stringify(roles, null, 2));

        const invitados = await prisma.user.findMany({
            where: { role: 'INVITADO' },
            select: { id: true, fullName: true, leaderId: true, leader: { select: { fullName: true, id: true } } }
        });
        console.log('Invitados found:', JSON.stringify(invitados, null, 2));

        const disciples = await prisma.user.findMany({
            where: { role: 'DISCIPULO' },
            take: 5,
            select: { id: true, fullName: true, leaderId: true, leader: { select: { fullName: true, id: true } } }
        });
        console.log('Sample Disciples:', JSON.stringify(disciples, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();
