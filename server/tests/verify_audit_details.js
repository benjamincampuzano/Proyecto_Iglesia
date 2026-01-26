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

async function verifyAuditDetails() {
    console.log('=== VERIFICACIÓN DE AUDITORÍA DETALLADA DE USUARIOS ===\n');

    try {
        // 1. Create a temporary user
        console.log('Creando usuario de prueba...');
        const uniqueEmail = `test_audit_${Date.now()}@example.com`;
        const createReq = mockRequest({}, {
            email: uniqueEmail,
            password: 'password123',
            fullName: 'Test Audit User',
            role: 'DISCIPULO'
        });
        const createRes = mockResponse();
        await userController.createUser(createReq, createRes);

        if (createRes.statusCode !== 201) {
            throw new Error(`Error al crear usuario: ${JSON.stringify(createRes.data)}`);
        }

        const userId = createRes.data.user.id;
        console.log(`✅ Usuario creado (ID: ${userId})`);

        // 2. Update the user
        console.log('\nActualizando usuario (cambiando fullName y role)...');
        const updateReq = mockRequest({ id: userId.toString() }, {
            fullName: 'Updated Audit User',
            role: 'LIDER_CELULA'
        });
        const updateRes = mockResponse();
        await userController.updateUser(updateReq, updateRes);

        if (updateRes.statusCode !== 200) {
            throw new Error(`Error al actualizar usuario: ${JSON.stringify(updateRes.data)}`);
        }
        console.log('✅ Usuario actualizado');

        // 3. Check Audit Logs
        console.log('\nConsultando log de auditoría...');
        const lastLog = await prisma.auditLog.findFirst({
            where: {
                entityType: 'USER',
                entityId: userId,
                action: 'UPDATE'
            },
            orderBy: { createdAt: 'desc' }
        });

        if (lastLog) {
            console.log('✅ Log encontrado');
            const details = JSON.parse(lastLog.details);
            console.log('Detalles del log:', JSON.stringify(details, null, 2));

            if (details.changes && details.changes.fullName && details.changes.role) {
                console.log('✅ Los cambios detallados están presentes en el log:');
                console.log(`   - fullName: ${details.changes.fullName.old} -> ${details.changes.fullName.new}`);
                console.log(`   - role: ${details.changes.role.old} -> ${details.changes.role.new}`);
            } else {
                console.log('❌ Los cambios detallados NO están presentes o están incompletos');
            }
        } else {
            console.log('❌ No se encontró el log de auditoría');
        }

        // Cleanup
        console.log('\nLimpiando datos de prueba...');
        await prisma.auditLog.deleteMany({ where: { entityId: userId, entityType: 'USER' } });
        await prisma.user.delete({ where: { id: userId } });
        console.log('✅ Datos eliminados');

    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyAuditDetails();
