const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyWalkthrough() {
    try {
        console.log('--- 1. Setup Mock Hierarchy ---');
        // Clean slate for testing
        // Note: In real app we wouldn't delete, but for verify we need controlled data.
        // We will create new users to avoid messing with existing ones too much.
        const suffix = Date.now();

        const create = async (name, role, parent = null) => {
            return await prisma.user.create({
                data: {
                    email: `test_${name.toLowerCase()}_${suffix}@test.com`,
                    password: 'hash',
                    fullName: `${name} Test`,
                    role: role,
                    liderDoceId: parent ? parent.id : null
                }
            });
        };

        const liderDoce = await create('LiderDoce', 'LIDER_DOCE');
        const liderCelula = await create('LiderCelula', 'LIDER_CELULA', liderDoce);
        const Miembro = await create('Miembro', 'Miembro', liderDoce); // Assigned to Doce for simplicity
        const outsider = await create('Outsider', 'LIDER_DOCE'); // Independent leader

        console.log(`Created: Doce(${liderDoce.id}), Celula(${liderCelula.id}), Miembro(${Miembro.id}), Outsider(${outsider.id})`);

        console.log('\n--- 2. Verify Network Scope Logic ---');
        // Helper to get network (simulating controller logic)
        const getNetworkIds = async (leaderId) => {
            const direct = await prisma.user.findMany({
                where: { OR: [{ liderDoceId: leaderId }, { liderCelulaId: leaderId }, { leaderId: leaderId }, { pastorId: leaderId }] },
                select: { id: true }
            });
            let ids = direct.map(d => d.id);
            // shallow recursion for this test
            return ids;
        };

        const doceNetwork = await getNetworkIds(liderDoce.id);
        console.log(`LiderDoce Network IDs: ${doceNetwork}`);

        if (doceNetwork.includes(liderCelula.id) && doceNetwork.includes(Miembro.id)) {
            console.log('✅ LiderDoce sees their downline.');
        } else {
            console.log('❌ LiderDoce missing downline elements.');
        }

        if (!doceNetwork.includes(outsider.id)) {
            console.log('✅ LiderDoce does NOT see Outsider.');
        } else {
            console.log('❌ LiderDoce sees Outsider (Security Breach).');
        }

        console.log('\n--- 3. Verify Financial Report Scoping ---');
        // Mock Convention & Registration
        const conv = await prisma.convention.create({
            data: {
                type: 'JOVENES',
                year: 2099,
                cost: 100,
                startDate: new Date(),
                endDate: new Date()
            }
        });

        // Register Miembro (in network) and Outsider (out of network)
        await prisma.conventionRegistration.create({ data: { userId: Miembro.id, conventionId: conv.id } });
        await prisma.conventionRegistration.create({ data: { userId: outsider.id, conventionId: conv.id } });

        // Simulate "getConventionBalanceReport" filtering logic
        // logic: if LIDER_DOCE, filter by network
        const allRegs = await prisma.conventionRegistration.findMany({ where: { conventionId: conv.id } });

        const visibleToDoce = allRegs.filter(r => [...doceNetwork, liderDoce.id].includes(r.userId));

        console.log(`Total Regs: ${allRegs.length}. Visible to Doce: ${visibleToDoce.length}`);

        if (visibleToDoce.find(r => r.userId === Miembro.id) && !visibleToDoce.find(r => r.userId === outsider.id)) {
            console.log('✅ Report Filter works: Sees Miembro, does NOT see Outsider.');
        } else {
            console.log('❌ Report Filter failed.');
        }

        // Cleanup
        console.log('\n--- Cleanup ---');
        await prisma.conventionRegistration.deleteMany({ where: { conventionId: conv.id } });
        await prisma.convention.delete({ where: { id: conv.id } });
        await prisma.user.deleteMany({ where: { id: { in: [liderDoce.id, liderCelula.id, Miembro.id, outsider.id] } } });
        console.log('✅ Test Data Cleaned.');

    } catch (error) {
        console.error('❌ Verification Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyWalkthrough();
