const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGuestSchema() {
  try {
    console.log('=== CAMPOS DEL MODELO GUEST ===');
    const guest = await prisma.guest.findFirst({
      select: {
        name: true,
        assignedToId: true,
        assignedTo: { select: { profile: { select: { fullName: true } } } }
      },
      take: 1
    });
    
    if (guest) {
      console.log('Ejemplo de invitado:');
      console.log('Nombre:', guest.name);
      console.log('assignedToId:', guest.assignedToId);
      console.log('Asignado a:', guest.assignedTo?.profile?.fullName || 'N/A');
    } else {
      console.log('No hay invitados para mostrar');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkGuestSchema();
