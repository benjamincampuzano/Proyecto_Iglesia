const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRelationships() {
    try {
        console.log("Searching for 'Alex Cardona Sanchez'...");
        const alex = await prisma.user.findFirst({
            where: { fullName: { contains: 'Alex Cardona', mode: 'insensitive' } },
            include: { disciples: true }
        });

        if (!alex) {
            console.log("User 'Alex Cardona Sanchez' not found.");
        } else {
            console.log("Found Alex:", { id: alex.id, role: alex.role, leaderId: alex.leaderId });
            console.log("Direct Disciples count:", alex.disciples.length);
        }

        console.log("\nSearching for 'Concepcion Antunez'...");
        const concepcion = await prisma.user.findFirst({
            where: { fullName: { contains: 'Concepcion', mode: 'insensitive' } }
        });

        if (!concepcion) {
            console.log("User 'Concepcion Antunez' not found.");
        } else {
            console.log("Found Concepcion:", {
                id: concepcion.id,
                role: concepcion.role,
                leaderId: concepcion.leaderId,
                liderDoceId: concepcion.liderDoceId,
                liderCelulaId: concepcion.liderCelulaId
            });

            if (alex) {
                if (concepcion.leaderId === alex.id) {
                    console.log("SUCCESS: Concepcion.leaderId points to Alex.");
                } else {
                    console.log(`FAILURE: Concepcion.leaderId is ${concepcion.leaderId}, expected ${alex.id}`);
                }
            }
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkRelationships();
