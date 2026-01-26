const { PrismaClient } = require('@prisma/client');
const cellController = require('../controllers/cellController');
const axios = require('axios');

const prisma = new PrismaClient();

// Mock request and response objects
const mockRequest = (body = {}, params = {}, user = null) => ({
    body,
    params,
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

async function testCellsModule() {
    console.log('=== PRUEBAS DEL MÓDULO DE CÉLULAS ===\n');

    // Evitar llamadas externas en geocoding
    axios.get = async () => ({ data: [{ lat: '0', lon: '0' }] });

    // Test 1: Obtener líderes elegibles (como ADMIN)
    console.log('Test 1: Obtener líderes elegibles (como ADMIN)');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        if (!adminUser) {
            console.log('❌ No hay usuario administrador en la BD');
            return;
        }

        const req = mockRequest({}, {}, adminUser);
        const res = mockResponse();
        await cellController.getEligibleLeaders(req, res);

        // getEligibleLeaders responde con array directo
        if (Array.isArray(res.data)) {
            console.log(`✅ Obtuvo ${res.data.length} líderes elegibles correctamente`);
        } else {
            console.log('❌ Falló obtener líderes elegibles');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de obtener líderes elegibles:', error.message);
    }

    // Test 2: Crear nueva célula
    console.log('\nTest 2: Crear nueva célula');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const leaderUser = await prisma.user.findFirst({
            where: { role: { in: ['LIDER_DOCE', 'LIDER_CELULA'] } }
        });

        if (!leaderUser) {
            console.log('❌ No hay usuario líder para crear célula');
            return;
        }

        const testCellData = {
            name: `Célula de Prueba ${Date.now()}`,
            description: 'Descripción de prueba',
            address: 'Dirección de prueba',
            city: 'Ciudad de prueba',
            dayOfWeek: 'Martes',
            time: '19:00',
            leaderId: leaderUser.id,
            hostId: leaderUser.id
        };

        const req = mockRequest(testCellData, {}, adminUser);
        const res = mockResponse();
        await cellController.createCell(req, res);

        // createCell responde con la célula directamente (no usa res.status)
        if (res.data && res.data.id) {
            console.log('✅ Célula creada correctamente');
            console.log(`   ID: ${res.data.id}, Nombre: ${res.data.name}`);
            
            // Verificar que se asignó correctamente el líder
            if (res.data.leaderId === leaderUser.id) {
                console.log('✅ Célula asignada correctamente al líder');
            } else {
                console.log('❌ Célula no fue asignada al líder');
            }

            // Limpiar: eliminar la célula de prueba
            await prisma.cell.delete({
                where: { id: res.data.id }
            });
            console.log('✅ Célula de prueba eliminada');
        } else {
            console.log('❌ Falló crear célula');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de crear célula:', error.message);
    }

    // Test 3: Validación de campos requeridos
    console.log('\nTest 3: Validación de campos requeridos');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const req = mockRequest({}, {}, adminUser); // Sin datos requeridos
        const res = mockResponse();
        await cellController.createCell(req, res);

        if (res.statusCode === 400) {
            console.log('✅ Valida correctamente campos requeridos');
        } else {
            console.log('❌ No valida campos requeridos');
        }
    } catch (error) {
        console.log('❌ Error en test de validación:', error.message);
    }

    // Test 4: Actualizar coordenadas de célula
    console.log('\nTest 4: Actualizar coordenadas de célula');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const leaderUser = await prisma.user.findFirst({
            where: { role: { in: ['LIDER_DOCE', 'LIDER_CELULA'] } }
        });

        if (adminUser && leaderUser) {
            // Crear célula con address/city para geocoding
            const testCell = await prisma.cell.create({
                data: {
                    name: `Célula para Coordenadas ${Date.now()}`,
                    leaderId: leaderUser.id,
                    hostId: leaderUser.id,
                    address: 'Dirección de prueba',
                    city: 'Ciudad de prueba',
                    dayOfWeek: 'Martes',
                    time: '19:00'
                }
            });

            const req = mockRequest({}, { id: testCell.id.toString() }, adminUser);
            const res = mockResponse();
            await cellController.updateCellCoordinates(req, res);

            if (res.data && res.data.id) {
                console.log('✅ Coordenadas actualizadas correctamente');

                const updatedCell = await prisma.cell.findUnique({ where: { id: testCell.id } });
                if (updatedCell.latitude !== null && updatedCell.longitude !== null) {
                    console.log('✅ Coordenadas guardadas correctamente en la BD');
                } else {
                    console.log('❌ Coordenadas no se guardaron en la BD');
                }
            } else {
                console.log('❌ Falló actualizar coordenadas');
                console.log('Response:', res.data);
            }

            await prisma.cell.delete({ where: { id: testCell.id } });
        } else {
            console.log('⚠️  No hay suficientes usuarios para probar actualización');
        }
    } catch (error) {
        console.log('❌ Error en test de actualizar coordenadas:', error.message);
    }

    // Test 5: Obtener miembros elegibles (como ADMIN)
    console.log('\nTest 5: Obtener miembros elegibles (como ADMIN)');
    try {
        const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        const req = mockRequest({}, {}, adminUser);
        const res = mockResponse();
        await cellController.getEligibleMembers(req, res);

        if (Array.isArray(res.data)) {
            console.log(`✅ Obtuvo ${res.data.length} miembros elegibles correctamente`);
        } else {
            console.log('❌ Falló obtener miembros elegibles');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de obtener miembros elegibles:', error.message);
    }

    // Test 6: Asignar miembro a célula
    console.log('\nTest 6: Asignar miembro a célula');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const leaderUser = await prisma.user.findFirst({
            where: { role: { in: ['LIDER_DOCE', 'LIDER_CELULA'] } }
        });

        const memberUser = await prisma.user.findFirst({
            where: { role: 'DISCIPULO' }
        });

        if (adminUser && leaderUser && memberUser) {
            // Crear célula para asignar miembro
            const testCell = await prisma.cell.create({
                data: {
                    name: `Célula para Miembros ${Date.now()}`,
                    leaderId: leaderUser.id,
                    hostId: leaderUser.id,
                    address: 'Dirección de prueba',
                    city: 'Ciudad de prueba',
                    dayOfWeek: 'Martes',
                    time: '19:00'
                }
            });

            const req = mockRequest({
                cellId: testCell.id,
                userId: memberUser.id
            }, {}, adminUser);
            const res = mockResponse();
            await cellController.assignMember(req, res);

            if (res.data && res.data.message) {
                console.log('✅ Miembro asignado correctamente a la célula');
                
                // Verificar en BD
                const updatedUser = await prisma.user.findUnique({
                    where: { id: memberUser.id }
                });
                
                if (updatedUser.cellId === testCell.id) {
                    console.log('✅ La asignación se guardó correctamente en la BD');
                } else {
                    console.log('❌ La asignación no se guardó en la BD');
                }

                // Limpiar
                await prisma.user.update({
                    where: { id: memberUser.id },
                    data: { cellId: null }
                });
                await prisma.cell.delete({ where: { id: testCell.id } });
            } else {
                console.log('❌ Falló asignar miembro a célula');
                console.log('Response:', res.data);
            }
        } else {
            console.log('⚠️  No hay suficientes usuarios para probar asignación de miembro');
        }
    } catch (error) {
        console.log('❌ Error en test de asignar miembro:', error.message);
    }

    // Test 7: Eliminar célula
    console.log('\nTest 7: Eliminar célula');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const leaderUser = await prisma.user.findFirst({
            where: { role: { in: ['LIDER_DOCE', 'LIDER_CELULA'] } }
        });

        if (adminUser && leaderUser) {
            // Crear célula para eliminar
            const testCell = await prisma.cell.create({
                data: {
                    name: `Célula para Eliminar ${Date.now()}`,
                    leaderId: leaderUser.id,
                    hostId: leaderUser.id,
                    address: 'Dirección de prueba',
                    city: 'Ciudad de prueba',
                    dayOfWeek: 'Martes',
                    time: '19:00'
                }
            });

            const req = mockRequest({}, { id: testCell.id.toString() }, adminUser);
            const res = mockResponse();
            await cellController.deleteCell(req, res);

            if (res.data && res.data.message) {
                console.log('✅ Célula eliminada correctamente');
                
                // Verificar que no existe en la BD
                const deletedCell = await prisma.cell.findUnique({
                    where: { id: testCell.id }
                });
                
                if (!deletedCell) {
                    console.log('✅ Célula fue eliminada permanentemente de la BD');
                } else {
                    console.log('❌ Célula todavía existe en la BD');
                }
            } else {
                console.log('❌ Falló eliminar célula');
                // Limpiar manualmente si falló
                await prisma.cell.delete({ where: { id: testCell.id } });
            }
        } else {
            console.log('⚠️  No hay suficientes usuarios para probar eliminación');
        }
    } catch (error) {
        console.log('❌ Error en test de eliminar célula:', error.message);
    }

    // Test 8: Estadísticas de células
    console.log('\nTest 8: Estadísticas de células');
    console.log('⚠️  cellController no expone getCellStats actualmente (test omitido)');

    console.log('\n=== FIN DE PRUEBAS DE CÉLULAS ===');
}

// Ejecutar pruebas
testCellsModule()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
