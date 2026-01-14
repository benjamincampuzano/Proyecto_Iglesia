const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllUsers() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            fullName: true,
            role: true,
            leaderId: true,
            leader: { select: { fullName: true } }
        },
        orderBy: { fullName: 'asc' }
    });

    console.log('All users and their leaders:');
    users.forEach(u => {
        console.log(`- ${u.fullName} (${u.role}) -> Leader: ${u.leader?.fullName || 'none'}`);
    });

    // Check if Ernesto or Sara have Jose Carlos as leader
    const ernesto = users.find(u => u.fullName.includes('Ernesto'));
    const sara = users.find(u => u.fullName.includes('Sara'));
    const joseCarlos = users.find(u => u.fullName.includes('Jose Carlos'));

    console.log('\n--- Key relationships ---');
    console.log(`Ernesto's leader ID: ${ernesto?.leaderId} (Jose Carlos ID: ${joseCarlos?.id})`);
    console.log(`Sara's leader ID: ${sara?.leaderId} (Jose Carlos ID: ${joseCarlos?.id})`);

    if (ernesto?.leaderId === joseCarlos?.id || sara?.leaderId === joseCarlos?.id) {
        console.log('\n✓ Jose Carlos IS the leader of Ernesto or Sara');
        console.log('This is why he can see their invited guests (network-based visibility)');
    } else {
        console.log('\n✗ Jose Carlos is NOT the leader of Ernesto or Sara');
        console.log('There might be a bug in the visibility logic');
    }

    await prisma.$disconnect();
}

checkAllUsers().catch(console.error);
