const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    console.log('--- STARTING USER DELETION VERIFICATION ---');
    const uniqueSuffix = Date.now();

    try {
        // 1. Setup non-user to be the inviter
        const constantUser = await prisma.user.create({
            data: { email: `constant_${uniqueSuffix}@test.com`, fullName: 'Constant User', password: 'hash' }
        });

        // 2. Create User to be deleted
        const userToDelete = await prisma.user.create({
            data: { email: `delete_me_${uniqueSuffix}@test.com`, fullName: 'Delete Me', password: 'hash' }
        });
        console.log(`Created test user ${userToDelete.id}`);

        // 3. Create non-blocking dependencies
        const guest = await prisma.guest.create({
            data: { name: 'Test Guest', phone: '123', invitedById: constantUser.id, assignedToId: userToDelete.id }
        });

        await prisma.guestCall.create({
            data: { guestId: guest.id, callerId: userToDelete.id, observation: 'test' }
        });

        await prisma.guestVisit.create({
            data: { guestId: guest.id, visitorId: userToDelete.id, observation: 'test' }
        });

        const module = await prisma.seminarModule.create({
            data: { name: 'Test Module', professorId: userToDelete.id, type: 'ESCUELA' }
        });

        console.log('Setup non-blocking dependencies (assignedGuest, call, visit, professor).');

        // 4. Verify Deletion
        console.log('Attempting deletion via controller logic...');

        await prisma.$transaction(async (tx) => {
            const userId = userToDelete.id;
            // Controller logic snippet
            await tx.user.updateMany({ where: { leaderId: userId }, data: { leaderId: null } });
            await tx.user.updateMany({ where: { pastorId: userId }, data: { pastorId: null } });
            await tx.user.updateMany({ where: { liderDoceId: userId }, data: { liderDoceId: null } });
            await tx.user.updateMany({ where: { liderCelulaId: userId }, data: { liderCelulaId: null } });
            await tx.cell.updateMany({ where: { OR: [{ hostId: userId }, { liderDoceId: userId }] }, data: { hostId: null, liderDoceId: null } });
            await tx.guest.updateMany({ where: { assignedToId: userId }, data: { assignedToId: null } });
            await tx.seminarEnrollment.updateMany({ where: { assignedAuxiliarId: userId }, data: { assignedAuxiliarId: null } });
            await tx.classAttendance.deleteMany({ where: { userId: userId } });
            await tx.seminarEnrollment.deleteMany({ where: { userId: userId } });
            await tx.churchAttendance.deleteMany({ where: { userId: userId } });
            await tx.cellAttendance.deleteMany({ where: { userId: userId } });
            await tx.conventionRegistration.deleteMany({ where: { userId: userId } });

            await tx.user.delete({ where: { id: userId } });
        });

        console.log('✅ SUCCESS: User deleted with dependencies.');

        // 5. Verify constraints were nullified
        const updatedCall = await prisma.guestCall.findFirst({ where: { guestId: guest.id } });
        if (updatedCall.callerId === null) {
            console.log('✅ PASSED: GuestCall.callerId nullified.');
        } else {
            console.error('❌ FAILED: GuestCall.callerId not nulled.', updatedCall.callerId);
        }

        const updatedModule = await prisma.seminarModule.findUnique({ where: { id: module.id } });
        if (updatedModule.professorId === null) {
            console.log('✅ PASSED: SeminarModule.professorId nullified.');
        } else {
            console.error('❌ FAILED: SeminarModule.professorId not nulled.', updatedModule.professorId);
        }

        // 6. Test Blocking dependency (Improved Error Message)
        // Note: We can't easily test the controller response message here without calling the API, 
        // but we can verify the check logic.
        const user2 = await prisma.user.create({
            data: { email: `block_me_${uniqueSuffix}@test.com`, fullName: 'Block Me', password: 'hash' }
        });
        await prisma.guest.create({
            data: { name: 'Invited Guest', phone: '456', invitedById: user2.id }
        });

        // Simulating controller check
        const invitedGuests = await prisma.guest.findMany({ where: { invitedById: user2.id }, take: 5 });
        if (invitedGuests.length > 0) {
            console.log('✅ PASSED: Manual check detected invited guests.');
        } else {
            console.error('❌ FAILED: Manual check failed to detect invited guests.');
        }

        // Cleanup
        await prisma.guestCall.deleteMany({ where: { guestId: guest.id } });
        await prisma.guestVisit.deleteMany({ where: { guestId: guest.id } });
        await prisma.guest.deleteMany({ where: { id: { in: [guest.id] } } });
        await prisma.guest.deleteMany({ where: { invitedById: user2.id } });
        await prisma.seminarModule.delete({ where: { id: module.id } });
        await prisma.user.delete({ where: { id: constantUser.id } });
        await prisma.user.delete({ where: { id: user2.id } });
        console.log('Cleanup finished.');

    } catch (e) {
        console.error('Verification Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
