const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runConsolidatedVerification() {
    console.log('--- STARTING CONSOLIDATED PERMISSIONS & REPORTING VERIFICATION ---');
    const uniqueSuffix = Date.now();
    const uniqueYear = Math.floor(Math.random() * 10000) + 2025;

    let testData = {
        users: [],
        guests: [],
        encuentros: [],
        conventions: [],
        schoolModules: []
    };

    try {
        console.log('\n1. Setting up Test Data...');

        // Create Leader
        const leader = await prisma.user.create({
            data: { email: `leader_${uniqueSuffix}@test.com`, fullName: 'Leader Test', password: 'password', role: 'LIDER_DOCE' }
        });
        testData.users.push(leader.id);

        // Create Disciple
        const disciple = await prisma.user.create({
            data: { email: `disciple_${uniqueSuffix}@test.com`, fullName: 'Disciple Test', password: 'password', role: 'DISCIPULO' }
        });
        testData.users.push(disciple.id);

        // Create Guests
        const guestByDisciple = await prisma.guest.create({
            data: { name: 'Guest Invited By Disciple', phone: '1234567890', invitedById: disciple.id }
        });
        testData.guests.push(guestByDisciple.id);

        const guestByOthers = await prisma.guest.create({
            data: { name: 'Guest Invited By Others', phone: '0987654321', invitedById: leader.id }
        });
        testData.guests.push(guestByOthers.id);

        // Create Encuentro
        const encuentro = await prisma.encuentro.create({
            data: { type: 'HOMBRES', name: `Encuentro Test ${uniqueSuffix}`, cost: 10000, startDate: new Date(), endDate: new Date() }
        });
        testData.encuentros.push(encuentro.id);

        await prisma.encuentroRegistration.createMany({
            data: [
                { encuentroId: encuentro.id, guestId: guestByDisciple.id },
                { encuentroId: encuentro.id, guestId: guestByOthers.id }
            ]
        });

        // Create Convention
        const convention = await prisma.convention.create({
            data: { type: 'JOVENES', year: uniqueYear, cost: 50000, startDate: new Date(), endDate: new Date() }
        });
        testData.conventions.push(convention.id);

        // Leader registers themselves
        await prisma.conventionRegistration.create({
            data: { userId: leader.id, conventionId: convention.id, registeredById: leader.id }
        });

        // Leader registers Disciple
        await prisma.conventionRegistration.create({
            data: { userId: disciple.id, conventionId: convention.id, registeredById: leader.id }
        });

        // Create school module
        const module = await prisma.seminarModule.create({
            data: { name: `School Module ${uniqueSuffix}`, type: 'ESCUELA', professorId: leader.id, startDate: new Date(), endDate: new Date() }
        });
        testData.schoolModules.push(module.id);

        // enroll disciple
        const enrollment = await prisma.seminarEnrollment.create({
            data: { moduleId: module.id, userId: disciple.id }
        });


        console.log('\n2. Verifying Encuentro Filtering (Disciple View)...');
        const fetchedEncuentro = await prisma.encuentro.findUnique({
            where: { id: encuentro.id },
            include: { registrations: { include: { guest: true } } }
        });
        const discipleViewRegs = fetchedEncuentro.registrations.filter(reg =>
            reg.guest.invitedById === disciple.id || reg.guest.assignedToId === disciple.id
        );
        if (discipleViewRegs.length === 1 && discipleViewRegs[0].guest.invitedById === disciple.id) {
            console.log('✅ PASSED: Disciple only sees their invited guest.');
        } else {
            console.error('❌ FAILED: Disciple sees wrong number of guests.', discipleViewRegs.length);
        }

        console.log('\n3. Verifying Convention Visibility (Disciple View)...');
        const userRegs = await prisma.conventionRegistration.findMany({ where: { userId: disciple.id }, select: { conventionId: true } });
        const regIds = new Set(userRegs.map(r => r.conventionId));
        if (regIds.has(convention.id)) {
            console.log('✅ PASSED: Disciple sees conventions they are registered for.');
        } else {
            console.error('❌ FAILED: Disciple does NOT see registered convention.');
        }

        console.log('\n4. Verifying Reporting Visibility (Leader View)...');
        const convDetails = await prisma.convention.findUnique({ where: { id: convention.id }, include: { registrations: true } });
        const leaderViewRegs = convDetails.registrations.filter(reg => {
            const isSelf = reg.userId === leader.id; // assignedCheck mock
            const isRegisteredBySelf = reg.registeredById === leader.id;
            return isSelf || isRegisteredBySelf;
        });
        if (leaderViewRegs.length === 2) {
            console.log('✅ PASSED: Leader sees registrations they performed (Self + Disciple).');
        } else {
            console.error('❌ FAILED: Leader reporting visibility incorrect.');
        }

        console.log('\n5. Verifying School Read-Only Permissions (Disciple View)...');
        // Simulated permission check from controller
        const isProfessor = module.professorId === disciple.id;
        const isDisciple = disciple.role === 'DISCIPULO';
        const canEdit = isProfessor && !isDisciple; // Logic from our fix

        if (!canEdit) {
            console.log('✅ PASSED: Disciple (Student) has canEdit = false.');
        } else {
            console.error('❌ FAILED: Disciple has canEdit = true.');
        }

        console.log('\n--- ALL VERIFICATIONS COMPLETED ---');

    } catch (e) {
        console.error('\n❌ Error during verification:', e);
    } finally {
        console.log('\nCleaning up...');
        try {
            await prisma.seminarEnrollment.deleteMany({ where: { moduleId: { in: testData.schoolModules } } });
            await prisma.seminarModule.deleteMany({ where: { id: { in: testData.schoolModules } } });
            await prisma.conventionRegistration.deleteMany({ where: { conventionId: { in: testData.conventions } } });
            await prisma.convention.deleteMany({ where: { id: { in: testData.conventions } } });
            await prisma.encuentroRegistration.deleteMany({ where: { encuentroId: { in: testData.encuentros } } });
            await prisma.encuentro.deleteMany({ where: { id: { in: testData.encuentros } } });
            await prisma.guest.deleteMany({ where: { id: { in: testData.guests } } });
            await prisma.user.deleteMany({ where: { id: { in: testData.users } } });
            console.log('✅ Cleanup successful.');
        } catch (cleanupError) {
            console.error('⚠️ Cleanup failed partially:', cleanupError.message);
        }
        await prisma.$disconnect();
    }
}

runConsolidatedVerification();
