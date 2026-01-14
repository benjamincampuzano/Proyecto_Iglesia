// Script para verificar y crear invitados de prueba
// Ejecutar desde la carpeta server: node verify-and-create-guests.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('=== Verificando Invitados en la Base de Datos ===\n');

    // 1. Verificar todos los invitados
    const allGuests = await prisma.guest.findMany({
        include: {
            invitedBy: {
                select: { id: true, fullName: true, role: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    console.log(`Total de invitados en la base de datos: ${allGuests.length}\n`);

    if (allGuests.length > 0) {
        console.log('Invitados existentes:');
        allGuests.forEach(guest => {
            console.log(`  - ${guest.name} (ID: ${guest.id})`);
            console.log(`    Invitado por: ${guest.invitedBy?.fullName || 'N/A'} (ID: ${guest.invitedById})`);
            console.log(`    Estado: ${guest.status}`);
            console.log(`    Creado: ${guest.createdAt}`);
            console.log('');
        });
    }

    // 2. Verificar invitados para la red del PASTOR (IDs: 2, 3, 4, 5, 6)
    const pastorNetworkIds = [2, 3, 4, 5, 6];
    const guestsInPastorNetwork = await prisma.guest.findMany({
        where: {
            invitedById: { in: pastorNetworkIds }
        },
        include: {
            invitedBy: {
                select: { id: true, fullName: true, role: true }
            }
        }
    });

    console.log(`\nInvitados en la red del PASTOR (IDs: ${pastorNetworkIds.join(', ')}): ${guestsInPastorNetwork.length}\n`);

    if (guestsInPastorNetwork.length === 0) {
        console.log('⚠️  No hay invitados en la red del PASTOR.\n');
        console.log('¿Deseas crear invitados de prueba? (Edita este script y descomenta la sección de creación)\n');

        // DESCOMENTAR PARA CREAR INVITADOS DE PRUEBA

        console.log('Creando invitados de prueba...\n');

        // Crear invitados para diferentes usuarios en la red
        const testGuests = [
            {
                name: 'María González',
                phone: '3001234567',
                address: 'Calle 123 #45-67',
                invitedById: 3, // PASTOR
                status: 'NUEVO'
            },
            {
                name: 'Carlos Rodríguez',
                phone: '3009876543',
                address: 'Carrera 45 #12-34',
                invitedById: 2, // LIDER_DOCE (Freddy y Lina)
                status: 'CONTACTADO'
            },
            {
                name: 'Ana Martínez',
                phone: '3005555555',
                address: 'Avenida 67 #89-12',
                invitedById: 4, // LIDER_CELULA (Mayte Quiros)
                status: 'EN_CONSOLIDACION'
            },
            {
                name: 'Pedro Sánchez',
                phone: '3007777777',
                address: 'Calle 90 #12-34',
                invitedById: 5, // DISCIPULO (Jose Carlos aguila)
                status: 'NUEVO'
            },
            {
                name: 'Laura Pérez',
                phone: '3008888888',
                address: 'Carrera 12 #34-56',
                invitedById: 6, // LIDER_CELULA (Juan Pablo Heras)
                status: 'GANADO'
            }
        ];

        for (const guestData of testGuests) {
            const guest = await prisma.guest.create({
                data: guestData,
                include: {
                    invitedBy: {
                        select: { fullName: true }
                    }
                }
            });
            console.log(`✅ Creado: ${guest.name} - Invitado por ${guest.invitedBy.fullName}`);
        }

        console.log('\n✅ Invitados de prueba creados exitosamente!');

    } else {
        console.log('Invitados en la red del PASTOR:');
        guestsInPastorNetwork.forEach(guest => {
            console.log(`  - ${guest.name} (invitado por ${guest.invitedBy?.fullName})`);
        });
    }

    // 3. Mostrar resumen de usuarios en la red
    console.log('\n=== Usuarios en la Red del PASTOR ===\n');
    const networkUsers = await prisma.user.findMany({
        where: {
            id: { in: pastorNetworkIds }
        },
        select: {
            id: true,
            fullName: true,
            role: true,
            _count: {
                select: {
                    invitedGuests: true
                }
            }
        },
        orderBy: { id: 'asc' }
    });

    networkUsers.forEach(user => {
        console.log(`  ID ${user.id}: ${user.fullName} (${user.role})`);
        console.log(`    Invitados: ${user._count.invitedGuests}`);
    });

    console.log('\n=== Fin del Reporte ===\n');
}

main()
    .catch(e => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
