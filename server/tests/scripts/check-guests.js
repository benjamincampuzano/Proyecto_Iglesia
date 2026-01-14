const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGuests() {
    const guests = await prisma.guest.findMany({
        select: {
            id: true,
            name: true,
            invitedById: true,
            assignedToId: true,
            invitedBy: { select: { id: true, fullName: true } },
            assignedTo: { select: { id: true, fullName: true } }
        }
    });

    console.log('All guests with IDs:');
    guests.forEach(g => {
        console.log(`- ${g.name}`);
        console.log(`  invitedById: ${g.invitedById} (${g.invitedBy.fullName})`);
        console.log(`  assignedToId: ${g.assignedToId} (${g.assignedTo?.fullName || 'none'})`);
    });

    const joseCarlos = await prisma.user.findFirst({
        where: { fullName: { contains: 'Jose Carlos' } }
    });

    console.log(`\nJose Carlos ID: ${joseCarlos.id}`);
    console.log('Checking if any guest has invitedById or assignedToId = 11...');

    const guestsForJose = guests.filter(g =>
        g.invitedById === joseCarlos.id || g.assignedToId === joseCarlos.id
    );

    if (guestsForJose.length > 0) {
        console.log('✓ Found guests for Jose Carlos:');
        guestsForJose.forEach(g => console.log(`  - ${g.name}`));
    } else {
        console.log('✗ No guests should be visible to Jose Carlos');
        console.log('BUG: Jose Carlos is seeing guests he should not see!');
    }

    await prisma.$disconnect();
}

checkGuests().catch(console.error);
