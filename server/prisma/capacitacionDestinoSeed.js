const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const modules = [
        { code: 'CD-1A', name: 'Pastoreados en su amor', moduleNumber: 1, type: 'CAPACITACION_DESTINO' },
        { code: 'CD-1B', name: 'El Poder de una Visión', moduleNumber: 2, type: 'CAPACITACION_DESTINO' },
        { code: 'CD-2A', name: 'La Estrategia del Ganar', moduleNumber: 3, type: 'CAPACITACION_DESTINO' },
        { code: 'CD-2B', name: 'Familias con Propósito', moduleNumber: 4, type: 'CAPACITACION_DESTINO' },
        { code: 'CD-3A', name: 'Liderazgo Eficaz', moduleNumber: 5, type: 'CAPACITACION_DESTINO' },
        { code: 'CD-3B', name: 'El Espíritu Santo en Mí', moduleNumber: 6, type: 'CAPACITACION_DESTINO' },
    ];

    console.log('Seeding Capacitacion Destino modules...');

    for (const mod of modules) {
        const existing = await prisma.seminarModule.findUnique({
            where: { code: mod.code },
        });

        if (!existing) {
            await prisma.seminarModule.create({
                data: mod,
            });
            console.log(`Created module: ${mod.name}`);
        } else {
            // Update if exists to ensure names/types are correct
            await prisma.seminarModule.update({
                where: { code: mod.code },
                data: mod
            });
            console.log(`Updated module: ${mod.name}`);
        }
    }

    console.log('Seeding execution finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
