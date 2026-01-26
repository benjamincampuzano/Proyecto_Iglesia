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
    const totalEncuentroRegs = await prisma.encuentroRegistration.count();
    console.log('Total registros encuentros:', totalEncuentroRegs);

    console.log('\n=== ASISTENCIA CÉLULAS ===');
    const totalCellAttendances = await prisma.cellAttendance.count();
    console.log('Total asistencias células:', totalCellAttendances);

    console.log('\n=== PROBANDO CÁLCULO DE META ===');
    if (goals.length > 0) {
      const goal = goals[0];
      console.log(`\nProbando meta ID: ${goal.id}`);
      console.log(`Tipo: ${goal.type}`);
      console.log(`Usuario: ${goal.user?.profile?.fullName}`);
      
      // Simular el cálculo como lo hace el goalController
      let currentValue = 0;
      let networkIds = [];
      
      if (goal.userId) {
        // Simplificado: solo contar registros directos del usuario
        networkIds = [goal.userId];
        console.log(`Usuario ID: ${goal.userId}`);
      }

      if (goal.type === 'ENCUENTRO_REGISTRATIONS' && goal.encuentroId) {
        const regWhere = { encuentroId: goal.encuentroId };
        if (goal.userId) {
          regWhere.OR = [
            { guest: { assignedToId: { in: networkIds } } },
            { userId: { in: networkIds } }
          ];
        }
        currentValue = await prisma.encuentroRegistration.count({ where: regWhere });
        console.log(`Registros encontrados: ${currentValue}`);
        console.log(`Meta target: ${goal.targetValue}`);
        console.log(`Progreso: ${Math.round((currentValue / goal.targetValue) * 100)}%`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGoals();
