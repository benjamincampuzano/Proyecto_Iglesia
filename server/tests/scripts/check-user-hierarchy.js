// Script para verificar la jerarquía de usuarios
// Ejecutar desde la carpeta server: node check-user-hierarchy.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('=== Verificando Jerarquía de Usuarios ===\n');

    // Obtener todos los usuarios en la red del PASTOR
    const networkIds = [2, 3, 4, 5, 6];

    const users = await prisma.user.findMany({
        where: {
            id: { in: networkIds }
        },
        select: {
            id: true,
            fullName: true,
            role: true,
            pastorId: true,
            liderDoceId: true,
            liderCelulaId: true,
            leaderId: true,
            pastor: { select: { fullName: true } },
            liderDoce: { select: { fullName: true } },
            liderCelula: {
                select: {
                    fullName: true,
                    liderDoce: { select: { fullName: true } }
                }
            },
            leader: { select: { fullName: true } }
        },
        orderBy: { id: 'asc' }
    });

    users.forEach(user => {
        console.log(`\n--- Usuario ID ${user.id}: ${user.fullName} (${user.role}) ---`);
        console.log(`  pastorId: ${user.pastorId} ${user.pastor ? `(${user.pastor.fullName})` : ''}`);
        console.log(`  liderDoceId: ${user.liderDoceId} ${user.liderDoce ? `(${user.liderDoce.fullName})` : ''}`);
        console.log(`  liderCelulaId: ${user.liderCelulaId} ${user.liderCelula ? `(${user.liderCelula.fullName})` : ''}`);
        if (user.liderCelula?.liderDoce) {
            console.log(`    → Líder Doce vía Célula: ${user.liderCelula.liderDoce.fullName}`);
        }
        console.log(`  leaderId: ${user.leaderId} ${user.leader ? `(${user.leader.fullName})` : ''}`);
    });

    console.log('\n\n=== Análisis de getLiderName para cada usuario ===\n');

    // Simular la función getLiderName
    const getLiderName = (user) => {
        if (!user) return 'Sin Asignar';

        const role = user.role?.toUpperCase();

        // 1. If user is Lider Doce
        if (role === 'LIDER_DOCE') return user.fullName;

        // 2. Direct Lider Doce
        if (user.liderDoce) return user.liderDoce.fullName;

        // 3. Via Cell Leader
        if (user.liderCelula && user.liderCelula.liderDoce) {
            return user.liderCelula.liderDoce.fullName;
        }

        // 4. Fallback to Pastor if no Lider Doce found
        if (user.pastor) return user.pastor.fullName;
        if (role === 'PASTOR') return user.fullName;

        // 5. Fallback to legacy leader relation if any
        if (user.leader) return user.leader.fullName;

        return 'Sin Asignar';
    };

    users.forEach(user => {
        const liderName = getLiderName(user);
        console.log(`${user.fullName} (${user.role}) → Agrupado bajo: "${liderName}"`);
    });

    console.log('\n=== Fin del Análisis ===\n');
}

main()
    .catch(e => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
