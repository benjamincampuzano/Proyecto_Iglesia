const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCells() {
    try {
        const cells = await prisma.cell.findMany({
            select: {
                id: true,
                name: true,
                address: true,
                city: true,
                latitude: true,
                longitude: true
            }
        });
        console.log('Cell coordinates state:');
        cells.forEach(c => {
            console.log(`- ID: ${c.id}, Name: ${c.name}, Lat: ${c.latitude}, Lon: ${c.longitude}, Address: ${c.address}, City: ${c.city}`);
        });
    } catch (error) {
        console.error('Error checking cells:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkCells();
