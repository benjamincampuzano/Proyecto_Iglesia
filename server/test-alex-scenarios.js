const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testScenarios() {
    try {
        console.log('=== Testing Alex Network Management ===\n');

        // Get users
        const alex = await prisma.user.findFirst({ where: { fullName: { contains: 'Alex Cardona' } } });
        const martha = await prisma.user.findFirst({ where: { fullName: { contains: 'Martha' } } });
        const barbara = await prisma.user.findFirst({ where: { fullName: { contains: 'Bárbara' } } });
        const benjamin = await prisma.user.findFirst({ where: { fullName: { contains: 'Benjamin' } } });

        console.log('Current Structure:');
        console.log(`Alex (${alex.role}) - ID: ${alex.id}`);
        console.log(`  Martha (${martha.role}) - ID: ${martha.id}, Leader: ${martha.leaderId}`);
        console.log(`    Bárbara (${barbara.role}) - ID: ${barbara.id}, Leader: ${barbara.leaderId}`);
        console.log(`  Benjamin (${benjamin.role}) - ID: ${benjamin.id}, Leader: ${benjamin.leaderId}\n`);

        // Import controller functions
        const networkController = require('./controllers/networkController');

        // Test 1: Alex assigns Benjamin to Martha
        console.log('TEST 1: Alex assigns Benjamin to Martha');
        const req1 = {
            body: { userId: benjamin.id, leaderId: martha.id },
            user: { id: alex.id, role: alex.role }
        };

        let test1Result = '';
        const res1 = {
            json: (data) => { test1Result = `✓ SUCCESS: ${data.message}`; return data; },
            status: (code) => ({ json: (data) => { test1Result = `✗ ERROR ${code}: ${data.error}`; return data; } })
        };

        await networkController.assignUserToLeader(req1, res1);
        console.log(test1Result + '\n');

        // Test 2: Alex removes Bárbara from Martha (sets her leaderId to null)
        console.log('TEST 2: Alex removes Bárbara from Martha\'s network');
        const req2 = {
            params: { userId: barbara.id },
            user: { id: alex.id, role: alex.role }
        };

        let test2Result = '';
        const res2 = {
            json: (data) => { test2Result = `✓ SUCCESS: ${data.message}`; return data; },
            status: (code) => ({ json: (data) => { test2Result = `✗ ERROR ${code}: ${data.error}`; return data; } })
        };

        await networkController.removeUserFromNetwork(req2, res2);
        console.log(test2Result + '\n');

        // Verify final state
        const finalBenjamin = await prisma.user.findUnique({ where: { id: benjamin.id } });
        const finalBarbara = await prisma.user.findUnique({ where: { id: barbara.id } });

        console.log('Final Structure:');
        console.log(`Benjamin - Leader ID: ${finalBenjamin.leaderId} (should be ${martha.id})`);
        console.log(`Bárbara - Leader ID: ${finalBarbara.leaderId} (should be null)`);

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testScenarios();
