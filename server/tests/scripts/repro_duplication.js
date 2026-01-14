
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mock dependencies
const networkController = require('./controllers/networkController');

// Helper to clean up test data with retry
async function cleanup(ids) {
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
        try {
            await prisma.user.deleteMany({ where: { id: { in: ids } } });
            return;
        } catch (e) {
            console.log(`Cleanup attempt ${i + 1} failed, retrying...`);
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    console.log('Cleanup failed after retries');
}

async function reproDuplication() {
    console.log('--- Reproducing Duplication Issue ---');

    // 1. Create a hierarchy with double linking
    // LeaderDoc (Top)
    // -> LeaderCel (Child of Doc)
    //    -> Member (Child of Cel AND Child of Doc)

    // We use unique emails to avoid conflicts
    const timestamp = Date.now();

    try {
        const leaderDoc = await prisma.user.create({
            data: {
                fullName: `TestDoc_${timestamp}`,
                email: `doc_${timestamp}@test.com`,
                password: 'hash',
                role: 'LIDER_DOCE'
            }
        });

        const leaderCel = await prisma.user.create({
            data: {
                fullName: `TestCel_${timestamp}`,
                email: `cel_${timestamp}@test.com`,
                password: 'hash',
                role: 'LIDER_CELULA',
                liderDoceId: leaderDoc.id
            }
        });

        const member = await prisma.user.create({
            data: {
                fullName: `TestMember_${timestamp}`,
                email: `member_${timestamp}@test.com`,
                password: 'hash',
                role: 'DISCIPULO',
                liderCelulaId: leaderCel.id,
                liderDoceId: leaderDoc.id // <--- THE DOUBLE LINK
            }
        });

        console.log('Created test users:', { doc: leaderDoc.id, cel: leaderCel.id, mem: member.id });

        // 2. Fetch network for LeaderDoc
        const req = {
            params: { userId: leaderDoc.id },
            user: { id: leaderDoc.id, role: 'LIDER_DOCE' }
        };

        let responseData = null;
        const res = {
            status: (code) => ({ json: (d) => { console.log('Status', code); return d; } }),
            json: (d) => { responseData = d; }
        };

        // We assume we can access the unexported buildHierarchy by calling getNetwork
        // Or we just test the output of getNetwork
        await networkController.getNetwork(req, res);

        // 3. Analyze Response
        // Expected Structure:
        // Doc
        //  disciples: [ Cel, Member? ] -> if duplicated, Member is here

        if (responseData) {
            console.log('Root:', responseData.fullName);
            const directDisciples = responseData.disciples.map(d => d.fullName);
            console.log('Direct Disciples of Doc:', directDisciples);

            // Check children of Cel
            const celNode = responseData.disciples.find(d => d.id === leaderCel.id);
            if (celNode) {
                const celDisciples = celNode.disciples.map(d => d.fullName);
                console.log('Direct Disciples of Cel:', celDisciples);
            }

            const memberInRoot = responseData.disciples.find(d => d.id === member.id);
            const memberInCel = celNode && celNode.disciples.find(d => d.id === member.id);

            if (memberInRoot && memberInCel) {
                console.log('FAIL: Member appears TWICE (under Root and under Cel)');
            } else if (!memberInRoot && memberInCel) {
                console.log('PASS: Member appears only under Cel');
            } else {
                console.log('Unknown state:', { memberInRoot: !!memberInRoot, memberInCel: !!memberInCel });
            }
        }

        // Cleanup
        await cleanup([leaderDoc.id, leaderCel.id, member.id]);

    } catch (e) {
        console.error('Error:', e);
    }
}

async function run() {
    await reproDuplication();
    await prisma.$disconnect();
}

run();
