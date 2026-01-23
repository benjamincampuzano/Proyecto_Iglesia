const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkModel() {
    try {
        const user = await prisma.user.findFirst();
        console.log("User fields:", Object.keys(user || {}));
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkModel();
