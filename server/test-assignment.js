const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAssignment() {
    try {
        console.log('=== Testing: Alex assigns Bárbara to Martha ===\n');

        const alex = await prisma.user.findFirst({ where: { fullName: { contains: 'Alex Cardona' } } });
        const martha = await prisma.user.findFirst({ where: { fullName: { contains: 'Martha' } } });
        const barbara = await prisma.user.findFirst({ where: { fullName: { contains: 'Bárbara' } } });

        console.log('Current state:');
        console.log(`Alex: ID ${alex.id}, Role: ${alex.role}, Leader: ${alex.leaderId}`);
        console.log(`Martha: ID ${martha.id}, Role: ${martha.role}, Leader: ${martha.leaderId}`);
        console.log(`Bárbara: ID ${barbara.id}, Role: ${barbara.role}, Leader: ${barbara.leaderId}\n`);

        const networkController = require('./controllers/networkController');

        const req = {
            body: {
                userId: barbara.id,
                leaderId: martha.id
            },
            user: {
                id: alex.id,
                role: alex.role
            }
        };

        const res = {
            json: (data) => {
                console.log('✓ SUCCESS!');
                console.log(`Message: ${data.message}`);
                console.log(`User: ${data.user.fullName}, Leader ID: ${data.user.leaderId}`);
                return data;
            },
            status: (code) => ({
                json: (data) => {
                    console.log(`✗ ERROR ${code}`);
                    console.log(`Message: ${data.error}`);
                    return data;
                }
            })
        };

        await networkController.assignUserToLeader(req, res);

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testAssignment();
