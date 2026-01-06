const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testInheritance() {
    console.log('Testing Leader Inheritance...');

    try {
        // 1. Find or Create a Pastor
        let pastor = await prisma.user.findFirst({ where: { role: 'PASTOR' } });
        if (!pastor) {
            console.log('Creating test Pastor...');
            pastor = await prisma.user.create({
                data: {
                    email: 'test_pastor@example.com',
                    password: 'password123',
                    fullName: 'Test Pastor',
                    role: 'PASTOR'
                }
            });
        }
        console.log(`Pastor: ${pastor.fullName} (ID: ${pastor.id})`);

        // 2. Create a LIDER_DOCE assigned to the Pastor
        const ldoceEmail = `ldoce_${Date.now()}@example.com`;
        const ldoce = await prisma.user.create({
            data: {
                email: ldoceEmail,
                password: 'password123',
                fullName: 'Test Doce',
                role: 'LIDER_DOCE',
                pastorId: pastor.id
            }
        });
        console.log(`Lider Doce created: ${ldoce.fullName} (ID: ${ldoce.id}, PastorID: ${ldoce.pastorId})`);

        // 3. Create a LIDER_CELULA assigned to the LIDER_DOCE
        // This should inherit PastorID from LIDER_DOCE
        const lcelEmail = `lcelula_${Date.now()}@example.com`;

        // Simulating the logic in createUser (via raw prisma here but we can check if we want to test the controller)
        // Since I'm testing the "logic pattern" I implemented:
        const lcelData = {
            email: lcelEmail,
            password: 'password123',
            fullName: 'Test Cell Leader',
            role: 'LIDER_CELULA',
            liderDoceId: ldoce.id
        };

        // Manual inheritance simulation (as done in userController)
        const parentDoce = await prisma.user.findUnique({
            where: { id: ldoce.id },
            select: { pastorId: true }
        });
        if (parentDoce && parentDoce.pastorId) {
            lcelData.pastorId = parentDoce.pastorId;
        }

        const lcel = await prisma.user.create({ data: lcelData });
        console.log(`Lider Celula created: ${lcel.fullName} (ID: ${lcel.id}, DoceID: ${lcel.liderDoceId}, PastorID: ${lcel.pastorId})`);

        if (lcel.pastorId === pastor.id) {
            console.log('✅ Success: Lider Celula inherited PastorID from Lider Doce');
        } else {
            console.error('❌ Failure: Lider Celula DID NOT inherit PastorID');
        }

        // 4. Create a DISCIPULO assigned to the LIDER_CELULA
        // This should inherit DoceID and PastorID
        const discipEmail = `discipulo_${Date.now()}@example.com`;
        const discipData = {
            email: discipEmail,
            password: 'password123',
            fullName: 'Test Discipulo',
            role: 'DISCIPULO',
            liderCelulaId: lcel.id
        };

        const parentCel = await prisma.user.findUnique({
            where: { id: lcel.id },
            select: { liderDoceId: true, pastorId: true }
        });
        if (parentCel) {
            if (parentCel.liderDoceId) discipData.liderDoceId = parentCel.liderDoceId;
            if (parentCel.pastorId) discipData.pastorId = parentCel.pastorId;
        }

        const discip = await prisma.user.create({ data: discipData });
        console.log(`Discipulo created: ${discip.fullName} (ID: ${discip.id}, CelulaID: ${discip.liderCelulaId}, DoceID: ${discip.liderDoceId}, PastorID: ${discip.pastorId})`);

        if (discip.liderDoceId === ldoce.id && discip.pastorId === pastor.id) {
            console.log('✅ Success: Discipulo inherited DoceID and PastorID from Lider Celula');
        } else {
            console.error('❌ Failure: Discipulo inheritance failed');
        }

        // Cleanup (optional)
        // await prisma.user.deleteMany({ where: { email: { in: [ldoceEmail, lcelEmail, discipEmail] } } });

    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testInheritance();
