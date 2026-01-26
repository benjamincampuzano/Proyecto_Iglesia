const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateGuest() {
  try {
    // Buscar el invitado por nombre primero
    const guest = await prisma.guest.findFirst({
      where: { name: 'Benjamin Campuzano' }
    });
    
    if (!guest) {
      console.log('No se encontró el invitado "Benjamin Campuzano"');
      return;
    }
    
    // Actualizar el invitado existente para asignarlo a Cesar y Monica (ID: 4)
    const updated = await prisma.guest.update({
      where: { id: guest.id },
      data: { assignedToId: 4 },
      include: {
        assignedTo: { select: { profile: { select: { fullName: true } } } }
      }
    });
    
    console.log('Invitado actualizado:');
    console.log('Nombre:', updated.name);
    console.log('assignedToId:', updated.assignedToId);
    console.log('Asignado a:', updated.assignedTo?.profile?.fullName);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateGuest();
