const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGoals() {
  try {
    console.log('=== METAS EXISTENTES ===');
    const goals = await prisma.goal.findMany({
      include: {
        encuentro: { select: { id: true, name: true, startDate: true } },
        convention: { select: { id: true, theme: true, startDate: true } },
        user: { select: { id: true, profile: { select: { fullName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('Total metas:', goals.length);
    goals.forEach(goal => {
      console.log(`ID: ${goal.id} | Tipo: ${goal.type} | Usuario: ${goal.user?.profile?.fullName || 'N/A'} | Target: ${goal.targetValue}`);
      if (goal.encuentro) console.log(`  Encuentro: ${goal.encuentro.name} (${goal.encuentro.startDate})`);
      if (goal.convention) console.log(`  Convención: ${goal.convention.theme} (${goal.convention.startDate})`);
      if (goal.month && goal.year) console.log(`  Período: ${goal.month}/${goal.year}`);
      console.log('---');
    });

    console.log('\n=== REGISTROS DE ENCUENTROS ===');
    const encuentroRegs = await prisma.encuentroRegistration.findMany({
      include: {
        encuentro: { select: { name: true } },
        guest: { 
          select: { 
            name: true,
            assignedTo: { select: { profile: { select: { fullName: true } } } } 
          } 
        },
        user: { select: { profile: { select: { fullName: true } } } }
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('Total registros encuentros:', await prisma.encuentroRegistration.count());
    encuentroRegs.forEach(reg => {
      const userName = reg.user?.profile?.fullName || reg.guest?.name || 'N/A';
      const assignedTo = reg.guest?.assignedTo?.profile?.fullName || 'Directo';
      console.log(`${userName} -> ${reg.encuentro.name} (Asignado a: ${assignedTo})`);
    });

    console.log('\n=== ASISTENCIA CÉLULAS (últimos 10) ===');
    const cellAttendances = await prisma.cellAttendance.findMany({
      include: {
        user: { select: { profile: { select: { fullName: true } } } },
        cell: { select: { name: true, leader: { select: { profile: { select: { fullName: true } } } } } }
      },
      take: 10,
      orderBy: { date: 'desc' }
    });
    
    console.log('Total asistencias células:', await prisma.cellAttendance.count());
    cellAttendances.forEach(att => {
      console.log(`${att.user?.profile?.fullName || 'N/A'} -> ${att.cell.name} (${att.status}) - Líder: ${att.cell.leader?.profile?.fullName || 'N/A'}`);
    });

    console.log('\n=== USUARIOS Y SUS LÍDERES ===');
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { liderDoceId: { not: null } },
          { liderCelulaId: { not: null } },
          { assignedGuests: { some: {} } },
          { ledCells: { some: {} } }
        ]
      },
      include: {
        liderDoce: { select: { profile: { select: { fullName: true } } } },
        liderCelula: { select: { profile: { select: { fullName: true } } } },
        assignedGuests: { take: 3, select: { name: true } },
        ledCells: { take: 3, select: { name: true } }
      },
      take: 10
    });

    users.forEach(user => {
      console.log(`Usuario: ${user.profile?.fullName || 'N/A'}`);
      if (user.liderDoce) console.log(`  Líder 12: ${user.liderDoce.profile?.fullName}`);
      if (user.liderCelula) console.log(`  Líder Célula: ${user.liderCelula.profile?.fullName}`);
      if (user.assignedGuests.length > 0) {
        console.log(`  Invitados asignados: ${user.assignedGuests.map(g => g.name).join(', ')}`);
      }
      if (user.ledCells.length > 0) {
        console.log(`  Células que lidera: ${user.ledCells.map(c => c.name).join(', ')}`);
      }
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGoals();
