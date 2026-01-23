const { createsHierarchyCycle } = require('./services/hierarchyService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testService() {
    console.log("--- Testing Hierarchy Service Logic ---");

    try {
        // 1. Cycle Detection
        // Let's grab two random users
        const users = await prisma.user.findMany({ take: 2 });
        if (users.length < 2) {
            console.log("Not enough users to test.");
            return;
        }

        const [u1, u2] = users;
        console.log(`Testing cycle between User ${u1.id} and User ${u2.id}`);

        // Check if U1 can be parent of U1 (Self-loop) - Should be TRUE
        const selfLoop = await createsHierarchyCycle(u1.id, u1.id);
        console.log(`Self Loop Check (Expected: true): ${selfLoop}`);

        // Check if U1 can be parent of U2 (Assuming no prior relation)
        // If they are unrelated, should be False.
        const normalCheck = await createsHierarchyCycle(u1.id, u2.id);
        console.log(`Normal Check (Expected: false if unrelated): ${normalCheck}`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

testService();
