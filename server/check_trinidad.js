const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const trinidad = await prisma.user.findUnique({ where: { id: 3 } });
    console.log('Trinidad Details (ID 3):', trinidad);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
