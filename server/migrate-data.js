const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateData() {
    try {
        console.log('========================================');
        console.log('Migrating Existing Data');
        console.log('========================================\n');

        // Get all users with their current leaderId
        const users = await prisma.user.findMany({
            where: {
                leaderId: { not: null }
            },
            include: {
                leader: {
                    include: {
                        leader: true // Get leader's leader for deeper hierarchy
                    }
                }
            }
        });

        console.log(`Found ${users.length} users with leaders\n`);

        let MiembrosUpdated = 0;
        let liderCelulaUpdated = 0;
        let liderDoceUpdated = 0;

        for (const user of users) {
            const leader = user.leader;

            if (!leader) continue;

            console.log(`Processing: ${user.fullName} (${user.role}) → Leader: ${leader.fullName} (${leader.role})`);

            // Determine how to populate the new fields based on user role and leader role
            if (user.role === 'Miembro') {
                if (leader.role === 'LIDER_CELULA') {
                    // Miembro under LIDER_CELULA
                    // liderCelulaId = current leaderId
                    // liderDoceId = LIDER_CELULA's leaderId (if exists)
                    // pastorId = LIDER_DOCE's leaderId (if exists)

                    const liderDoce = leader.leader;
                    const pastor = liderDoce?.leader;

                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            liderCelulaId: leader.id,
                            liderDoceId: liderDoce?.id || null,
                            pastorId: pastor?.id || null
                        }
                    });
                    console.log(`  ✓ Set liderCelulaId=${leader.id}, liderDoceId=${liderDoce?.id || 'null'}, pastorId=${pastor?.id || 'null'}`);
                    MiembrosUpdated++;

                } else if (leader.role === 'LIDER_DOCE') {
                    // Miembro directly under LIDER_DOCE (no LIDER_CELULA)
                    // liderDoceId = current leaderId
                    // pastorId = LIDER_DOCE's leaderId (if exists)

                    const pastor = leader.leader;

                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            liderDoceId: leader.id,
                            pastorId: pastor?.id || null
                        }
                    });
                    console.log(`  ✓ Set liderDoceId=${leader.id}, pastorId=${pastor?.id || 'null'}`);
                    MiembrosUpdated++;
                }

            } else if (user.role === 'LIDER_CELULA') {
                if (leader.role === 'LIDER_DOCE') {
                    // LIDER_CELULA under LIDER_DOCE
                    // liderDoceId = current leaderId
                    // pastorId = LIDER_DOCE's leaderId (if exists)

                    const pastor = leader.leader;

                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            liderDoceId: leader.id,
                            pastorId: pastor?.id || null
                        }
                    });
                    console.log(`  ✓ Set liderDoceId=${leader.id}, pastorId=${pastor?.id || 'null'}`);
                    liderCelulaUpdated++;
                }

            } else if (user.role === 'LIDER_DOCE') {
                if (leader.role === 'PASTOR' || leader.role === 'SUPER_ADMIN') {
                    // LIDER_DOCE under PASTOR
                    // pastorId = current leaderId

                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            pastorId: leader.id
                        }
                    });
                    console.log(`  ✓ Set pastorId=${leader.id}`);
                    liderDoceUpdated++;
                }
            }
        }

        console.log('\n========================================');
        console.log('Data Migration Summary');
        console.log('========================================');
        console.log(`Miembro updated: ${MiembrosUpdated}`);
        console.log(`LIDER_CELULA updated: ${liderCelulaUpdated}`);
        console.log(`LIDER_DOCE updated: ${liderDoceUpdated}`);
        console.log(`Total: ${MiembrosUpdated + liderCelulaUpdated + liderDoceUpdated}`);
        console.log('========================================\n');

    } catch (error) {
        console.error('Data migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

migrateData();
