const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getUserNetwork = async (leaderId) => {
    const network = [];
    const queue = [leaderId];
    const visited = new Set();

    console.log(`Starting network search for leaderId: ${leaderId}`);

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        console.log(`Checking children for currentId: ${currentId}`);

        const children = await prisma.user.findMany({
            where: {
                OR: [
                    { leaderId: currentId },
                    { liderDoceId: currentId },
                    { liderCelulaId: currentId },
                    { pastorId: currentId }
                ]
            },
            select: { id: true, fullName: true, role: true, pastorId: true, liderDoceId: true, leaderId: true }
        });

        console.log(`Found ${children.length} children for ${currentId}:`, children.map(c => `${c.fullName} (ID:${c.id})`));

        for (const child of children) {
            if (!visited.has(child.id)) {
                network.push(child.id);
                queue.push(child.id);
            }
        }
    }
    return network;
};

async function main() {
    const sergioId = 1;
    const network = await getUserNetwork(sergioId);
    console.log('Final Network IDs:', network);

    // Check Trinidad specifically
    const trinidad = await prisma.user.findUnique({ where: { id: 2 } });
    if (trinidad) {
        console.log('Trinidad record in DB:', {
            id: trinidad.id,
            fullName: trinidad.fullName,
            pastorId: trinidad.pastorId,
            liderDoceId: trinidad.liderDoceId,
            leaderId: trinidad.leaderId
        });
    } else {
        console.log('Trinidad (ID 2) NOT found in DB');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
