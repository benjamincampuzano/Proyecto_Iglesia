const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simulate the exact filter logic from guestController.js
async function testJoseCarlosFilter() {
    const user = { id: 11, role: 'LIDER_DOCE' }; // Jose Carlos

    console.log('Testing filter for Jose Carlos (LIDER_DOCE)...\n');

    // Get network
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

    const networkUserIds = await getUserNetwork(user.id);
    console.log('Network IDs:', networkUserIds);

    const securityFilter = {
        OR: [
            { invitedById: { in: networkUserIds } },
            { assignedToId: { in: networkUserIds } }
        ]
    };

    console.log('\nFilter:', JSON.stringify(securityFilter, null, 2));

    const guests = await prisma.guest.findMany({
        where: securityFilter,
        include: {
            invitedBy: { select: { id: true, fullName: true } },
            assignedTo: { select: { id: true, fullName: true } }
        }
    });

    console.log(`\n--- RESULT ---`);
    console.log(`Guests found: ${guests.length}`);

    if (guests.length > 0) {
        console.log('\nGuests:');
        guests.forEach(g => {
            console.log(`- ${g.name}`);
            console.log(`  invitedById: ${g.invitedById} (${g.invitedBy.fullName})`);
            console.log(`  assignedToId: ${g.assignedToId || 'null'} (${g.assignedTo?.fullName || 'none'})`);
        });
        console.log('\n❌ BUG: Jose Carlos should see 0 guests!');
    } else {
        console.log('✓ Correct: Jose Carlos sees 0 guests');
    }

    await prisma.$disconnect();
}

testJoseCarlosFilter().catch(console.error);
