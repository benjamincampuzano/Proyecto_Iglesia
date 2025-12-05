const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNetwork() {
    // Get Jose Carlos
    const joseCarlos = await prisma.user.findFirst({
        where: { fullName: { contains: 'Jose Carlos' } },
        select: { id: true, fullName: true, role: true }
    });

    console.log('Jose Carlos:', joseCarlos);

    // Get his disciples
    const disciples = await prisma.user.findMany({
        where: { leaderId: joseCarlos.id },
        select: { id: true, fullName: true, role: true }
    });

    console.log('Disciples of Jose Carlos:', disciples);

    // Get Ernesto and Sara
    const ernesto = await prisma.user.findFirst({
        where: { fullName: { contains: 'Ernesto' } },
        select: { id: true, fullName: true, leaderId: true }
    });

    const sara = await prisma.user.findFirst({
        where: { fullName: { contains: 'Sara' } },
        select: { id: true, fullName: true, leaderId: true }
    });

    console.log('Ernesto:', ernesto);
    console.log('Sara:', sara);

    // Get guests
    const guests = await prisma.guest.findMany({
        select: {
            id: true,
            name: true,
            invitedBy: { select: { fullName: true } },
            assignedTo: { select: { fullName: true } }
        }
    });

    console.log('\nAll guests:');
    guests.forEach(g => {
        console.log(`- ${g.name} (invited by: ${g.invitedBy.fullName}, assigned to: ${g.assignedTo?.fullName || 'none'})`);
    });

    await prisma.$disconnect();
}

checkNetwork().catch(console.error);
