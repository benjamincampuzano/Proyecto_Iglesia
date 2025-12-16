const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAdmin() {
    try {
        console.log('Fetching ALL users...');
        const users = await prisma.user.findMany();
        console.log(`Found ${users.length} total users.`);

        const target = users.find(u => u.email === 'admin@iglesia.com');

        if (target) {
            console.log('✅ Found match in JS list:', target);
            console.log(`Updating user ID ${target.id} role to SUPER_ADMIN...`);

            const updated = await prisma.user.update({
                where: { id: target.id },
                data: { role: 'SUPER_ADMIN' }
            });
            console.log('✅ Success! New Role:', updated.role);
        } else {
            console.log('❌ Still could not find admin@iglesia.com in the full list.');
            console.log('All emails:', users.map(u => u.email));
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixAdmin();
