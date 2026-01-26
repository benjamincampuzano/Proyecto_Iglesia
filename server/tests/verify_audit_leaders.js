const { PrismaClient } = require('@prisma/client');
const userController = require('../controllers/userController');

const prisma = new PrismaClient();

const mockRequest = (params = {}, body = {}, user = { role: 'ADMIN', id: 1 }) => ({
    params,
    body,
    user
});

const mockResponse = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function verifyAuditLeaderNames() {
    console.log('=== VERIFICACIÓN DE NOMBRES DE LÍDERES EN AUDITORÍA ===\n');

    try {
        // 1. Create a Pastor and a Leader
        console.log('Creando Pastor y Líder de prueba...');
        const pastor = await prisma.user.create({
            data: {
                email: `pastor_${Date.now()}@test.com`,
                password: 'hash',
                fullName: 'Pastor de Prueba',
                role: 'PASTOR'
            }
        });

        const leader = await prisma.user.create({
            data: {
                email: `leader_${Date.now()}@test.com`,
                password: 'hash',
                fullName: 'Líder 12 de Prueba',
                role: 'LIDER_DOCE',
                pastorId: pastor.id
            }
        });

        // 2. Create a User with the pastor
        console.log('Creando usuario asignado al Pastor...');
        const user = await prisma.user.create({
            data: {
                email: `user_${Date.now()}@test.com`,
                password: 'hash',
                fullName: 'Usuario de Prueba',
                role: 'DISCIPULO',
                pastorId: pastor.id,
                leaderId: pastor.id
            }
        });

        // 3. Update the user to move to the Leader
        console.log('\nActualizando usuario: moviendo de Pastor a Líder Doce...');
        const updateReq = mockRequest({ id: user.id.toString() }, {
            pastorId: pastor.id,
            liderDoceId: leader.id
        });
        const updateRes = mockResponse();
        await userController.updateUser(updateReq, updateRes);

        if (updateRes.statusCode !== 200) {
            throw new Error(`Error al actualizar usuario: ${JSON.stringify(updateRes.data)}`);
        }
        console.log('✅ Usuario actualizado');

        // 4. Check Audit Logs
        console.log('\nConsultando log de auditoría...');
        const lastLog = await prisma.auditLog.findFirst({
            where: {
                entityType: 'USER',
                entityId: user.id,
                action: 'UPDATE'
            },
            orderBy: { createdAt: 'desc' }
        });

        if (lastLog) {
            console.log('✅ Log encontrado');
            const details = JSON.parse(lastLog.details);
            console.log('Detalles del log:', JSON.stringify(details, null, 2));

            if (details.changes && details.changes['Líder Doce']) {
                const change = details.changes['Líder Doce'];
                console.log(`✅ Cambio en "Líder Doce" detectado:`);
                console.log(`   - Anterior: ${change.old}`);
                console.log(`   - Nuevo: ${change.new}`);

                if (change.new === 'Líder 12 de Prueba') {
                    console.log('✅ ÉXITO: El log muestra el NOMBRE en lugar del ID.');
                } else {
                    console.log('❌ FALLO: El log no muestra el nombre esperado.');
                }
            } else {
                console.log('❌ No se encontraron cambios de líderes en el log.');
            }
        } else {
            console.log('❌ No se encontró el log de auditoría');
        }

        // Cleanup
        console.log('\nLimpiando datos de prueba...');
        await prisma.auditLog.deleteMany({ where: { entityId: user.id, entityType: 'USER' } });
        await prisma.user.deleteMany({ where: { id: { in: [user.id, leader.id, pastor.id] } } });
        console.log('✅ Datos eliminados');

    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyAuditLeaderNames();
