const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to get network IDs (recursive) - COPIED FROM FIXED CODE
const getNetworkIds = async (leaderId) => {
    const directDisciples = await prisma.user.findMany({
        where: {
            OR: [
                { leaderId: leaderId },
                { liderDoceId: leaderId },
                { liderCelulaId: leaderId },
                { pastorId: leaderId }
            ]
        },
        select: { id: true, fullName: true, liderDoceId: true } // Added extra select for debug
    });

    // console.log(`Direct disciples of ${leaderId}:`, directDisciples.map(d => `${d.fullName} (Doce:${d.liderDoceId})`));

    let networkIds = directDisciples.map(d => d.id);

    for (const disciple of directDisciples) {
        if (disciple.id !== leaderId) {
            const subNetwork = await getNetworkIds(disciple.id);
            networkIds = [...networkIds, ...subNetwork];
        }
    }
    return [...new Set(networkIds)];
};

async function verifyFix() {
    try {
        console.log("Searching for 'Alex Cardona Sanchez'...");
        const alex = await prisma.user.findFirst({
            where: { fullName: { contains: 'Alex Cardona', mode: 'insensitive' } }
        });

        if (!alex) {
            console.log("User 'Alex Cardona Sanchez' not found.");
            return;
        }
        console.log(`Found Alex (ID: ${alex.id})`);

        console.log("Searching for 'Concepcion Antunez'...");
        const concepcion = await prisma.user.findFirst({
            where: { fullName: { contains: 'Concepcion', mode: 'insensitive' } }
        });

        if (!concepcion) {
            console.log("User 'Concepcion Antunez' not found.");
            return;
        }
        console.log(`Found Concepcion (ID: ${concepcion.id})`);

        console.log("Running getNetworkIds for Alex...");
        const networkIds = await getNetworkIds(alex.id);

        console.log(`Network size: ${networkIds.length}`);

        if (networkIds.includes(concepcion.id)) {
            console.log("SUCCESS: Concepcion is in Alex's network.");
        } else {
            console.log("FAILURE: Concepcion is NOT in Alex's network.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyFix();
