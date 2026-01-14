const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simulate the getAllGuests function for Jose Carlos
async function testGetAllGuests() {
    const user = { id: 11, role: 'LIDER_DOCE' }; // Jose Carlos

    // Helper function to get network
    const getUserNetwork = async (userId) => {
        const network = [];
        const queue = [userId];
        const visited = new Set();

        while (queue.length > 0) {
            const currentId = queue.shift();

            if (visited.has(currentId)) continue;
            visited.add(currentId);
            network.push(currentId);

            const disciples = await prisma.user.findMany({
                where: { leaderId: currentId },
                select: { id: true }
            });

            queue.push(...disciples.map(d => d.id));
        }

        return network;
    };

    let securityFilter = {};

    if (user.role === 'LIDER_DOCE') {
        const networkUserIds = await getUserNetwork(user.id);
        console.log('Network user IDs for Jose Carlos:', networkUserIds);

        securityFilter = {
            OR: [
                { invitedById: { in: networkUserIds } },
                { assignedToId: { in: networkUserIds } }
            ]
        };
    }

    console.log('\nSecurity filter:', JSON.stringify(securityFilter, null, 2));

    const guests = await prisma.guest.findMany({
        where: securityFilter,
        include: {
            invitedBy: { select: { fullName: true } },
            assignedTo: { select: { fullName: true } }
        }
    });

    console.log(`\nGuests found: ${guests.length}`);
    guests.forEach(g => {
        console.log(`- ${g.name} (invited by: ${g.invitedBy.fullName}, assigned to: ${g.assignedTo?.fullName || 'none'})`);
    });

    await prisma.$disconnect();
}

testGetAllGuests().catch(console.error);
