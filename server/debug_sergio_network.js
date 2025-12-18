const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getUserNetwork = async (userId) => {
    const id = parseInt(userId);
    if (isNaN(id)) return [];

    const directDisciples = await prisma.user.findMany({
        where: {
            OR: [
                { leaderId: id },
                { liderDoceId: id },
                { liderCelulaId: id },
                { pastorId: id }
            ]
        },
        select: { id: true, fullName: true, role: true }
    });

    let network = directDisciples.map(d => ({ id: d.id, name: d.fullName, role: d.role }));

    for (const disciple of directDisciples) {
        if (disciple.id !== id) {
            const subNetwork = await getUserNetwork(disciple.id);
            network = [...network, ...subNetwork];
        }
    }

    return network;
};

async function main() {
    const sergio = await prisma.user.findFirst({
        where: { fullName: { contains: 'Sergio Ríos Nogueira' } }
    });

    if (!sergio) {
        console.log('Sergio not found');
        return;
    }

    console.log('Sergio:', sergio.id, sergio.fullName, sergio.role);

    const network = await getUserNetwork(sergio.id);
    console.log('Network count:', network.length);
    console.log('Network names:', network.map(u => `${u.name} (${u.role})`).join(', '));

    const trinidad = await prisma.user.findFirst({
        where: { fullName: { contains: 'Trinidad Galindo' } }
    });

    if (trinidad) {
        console.log('Trinidad:', trinidad.id, trinidad.fullName, trinidad.role);
        const isInNetwork = network.some(u => u.id === trinidad.id);
        console.log('Is Trinidad in Sergio\'s network?', isInNetwork);
        console.log('Trinidad links:', {
            leaderId: trinidad.leaderId,
            liderDoceId: trinidad.liderDoceId,
            liderCelulaId: trinidad.liderCelulaId,
            pastorId: trinidad.pastorId
        });
    }

    const isaura = await prisma.user.findFirst({
        where: { fullName: { contains: 'Isaura Valbuena' } }
    });

    if (isaura) {
        console.log('Isaura:', isaura.id, isaura.fullName, isaura.role);
        const isInNetwork = network.some(u => u.id === isaura.id);
        console.log('Is Isaura in Sergio\'s network?', isInNetwork);
        console.log('Isaura links:', {
            leaderId: isaura.leaderId,
            liderDoceId: isaura.liderDoceId,
            liderCelulaId: isaura.liderCelulaId,
            pastorId: isaura.pastorId
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
