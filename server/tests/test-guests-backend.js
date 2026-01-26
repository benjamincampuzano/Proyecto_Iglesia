const { PrismaClient } = require('@prisma/client');
const guestController = require('../controllers/guestController');

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

async function testGuestsModule() {
    console.log('=== PRUEBAS DEL MÓDULO DE INVITADOS ===\n');

    // Test 1: Obtener todos los invitados (como ADMIN)
    console.log('Test 1: Obtener todos los invitados (como ADMIN)');
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
        await guestController.getAllGuests(req, res);

        if (res.statusCode === 200 && res.data.guests) {
            console.log(`✅ Obtuvo ${res.data.guests.length} invitados correctamente`);
            
            // Verificar estructura de datos
            if (res.data.guests.length > 0) {
                const firstGuest = res.data.guests[0];
                if (firstGuest.name && firstGuest.phone && firstGuest.status) {
                    console.log('✅ Los invitados tienen los campos requeridos');
                } else {
                    console.log('❌ Los invitados no tienen todos los campos requeridos');
                }
            }
        } else {
            console.log('❌ Falló obtener invitados');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de obtener invitados:', error.message);
    }

    // Test 2: Crear nuevo invitado
    console.log('\nTest 2: Crear nuevo invitado');
    try {
        const liderUser = await prisma.user.findFirst({
            where: { role: { in: ['LIDER_DOCE', 'LIDER_CELULA', 'ADMIN'] } }
        });

        if (!liderUser) {
            console.log('❌ No hay usuario líder para crear invitado');
            return;
        }

        const testGuestData = {
            name: `Invitado de Prueba ${Date.now()}`,
            phone: `555${Date.now().toString().slice(-7)}`,
            address: 'Dirección de prueba',
            prayerRequest: 'Oración de prueba'
        };

        const req = mockRequest(testGuestData, {}, liderUser);
        const res = mockResponse();
        await guestController.createGuest(req, res);

        if (res.statusCode === 201 && res.data.guest) {
            console.log('✅ Invitado creado correctamente');
            console.log(`   ID: ${res.data.guest.id}, Nombre: ${res.data.guest.name}`);
            
            // Verificar que se asignó correctamente el líder
            if (res.data.guest.invitedById === liderUser.id) {
                console.log('✅ Invitado asignado correctamente al líder');
            } else {
                console.log('❌ Invitado no fue asignado al líder');
            }

            // Limpiar: eliminar el invitado de prueba
            await prisma.guest.delete({
                where: { id: res.data.guest.id }
            });
            console.log('✅ Invitado de prueba eliminado');
        } else {
            console.log('❌ Falló crear invitado');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de crear invitado:', error.message);
    }

    // Test 3: Validación de campos requeridos
    console.log('\nTest 3: Validación de campos requeridos');
    try {
        const liderUser = await prisma.user.findFirst({
            where: { role: { in: ['LIDER_DOCE', 'LIDER_CELULA', 'ADMIN'] } }
        });

        const req = mockRequest({}, {}, liderUser); // Sin datos requeridos
        const res = mockResponse();
        await guestController.createGuest(req, res);

        if (res.statusCode === 400) {
            console.log('✅ Valida correctamente campos requeridos');
        } else {
            console.log('❌ No valida campos requeridos');
        }
    } catch (error) {
        console.log('❌ Error en test de validación:', error.message);
    }

    // Test 4: Actualizar estado de invitado
    console.log('\nTest 4: Actualizar estado de invitado');
    try {
        const liderUser = await prisma.user.findFirst({
            where: { role: { in: ['LIDER_DOCE', 'LIDER_CELULA', 'ADMIN'] } }
        });

        // Crear invitado para actualizar
        const testGuest = await prisma.guest.create({
            data: {
                name: `Invitado para Actualizar ${Date.now()}`,
                phone: `555${Date.now().toString().slice(-7)}`,
                invitedById: liderUser.id,
                status: 'NUEVO'
            }
        });

        const req = mockRequest({
            status: 'CONTACTADO',
            assignedToId: liderUser.id
        }, { id: testGuest.id.toString() }, liderUser);

        const res = mockResponse();
        await guestController.updateGuest(req, res);

        if (res.statusCode === 200 && res.data.guest) {
            console.log('✅ Invitado actualizado correctamente');
            
            // Verificar que se actualizó en la BD
            const updatedGuest = await prisma.guest.findUnique({
                where: { id: testGuest.id }
            });
            
            if (updatedGuest.status === 'CONTACTADO') {
                console.log('✅ El estado se actualizó correctamente en la BD');
            } else {
                console.log('❌ El estado no se actualizó en la BD');
            }

            // Limpiar
            await prisma.guest.delete({ where: { id: testGuest.id } });
        } else {
            console.log('❌ Falló actualizar invitado');
        }
    } catch (error) {
        console.log('❌ Error en test de actualizar invitado:', error.message);
    }

    // Test 5: Seguridad por rol - LIDER_DOCE solo ve invitados de su red
    console.log('\nTest 5: Seguridad por rol - LIDER_DOCE solo ve invitados de su red');
    try {
        const liderDoceUser = await prisma.user.findFirst({
            where: { role: 'LIDER_DOCE' }
        });

        if (liderDoceUser) {
            const req = mockRequest({}, {}, liderDoceUser);
            const res = mockResponse();
            await guestController.getAllGuests(req, res);

            if (res.statusCode === 200 && res.data.guests) {
                // Verificar que todos los invitados están relacionados con su red
                const allFromNetwork = res.data.guests.every(guest => 
                    guest.invitedById === liderDoceUser.id || 
                    guest.assignedToId === liderDoceUser.id
                );
                
                if (allFromNetwork || res.data.guests.length === 0) {
                    console.log('✅ LIDER_DOCE solo ve invitados de su red');
                } else {
                    console.log('❌ LIDER_DOCE ve invitados que no debería');
                }
            }
        } else {
            console.log('⚠️  No hay usuario LIDER_DOCE para probar seguridad');
        }
    } catch (error) {
        console.log('❌ Error en test de seguridad por rol:', error.message);
    }

    // Test 6: Asignar invitado a otro usuario
    console.log('\nTest 6: Asignar invitado a otro usuario');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const targetUser = await prisma.user.findFirst({
            where: { role: { in: ['LIDER_DOCE', 'LIDER_CELULA'] } }
        });

        if (adminUser && targetUser) {
            // Crear invitado para asignar
            const testGuest = await prisma.guest.create({
                data: {
                    name: `Invitado para Asignar ${Date.now()}`,
                    phone: `555${Date.now().toString().slice(-7)}`,
                    invitedById: adminUser.id,
                    status: 'NUEVO'
                }
            });

            const req = mockRequest({
                assignedToId: targetUser.id
            }, { id: testGuest.id.toString() }, adminUser);

            const res = mockResponse();
            await guestController.updateGuest(req, res);

            if (res.statusCode === 200 && res.data.guest) {
                console.log('✅ Invitado asignado correctamente');
                
                // Verificar en BD
                const assignedGuest = await prisma.guest.findUnique({
                    where: { id: testGuest.id }
                });
                
                if (assignedGuest.assignedToId === targetUser.id) {
                    console.log('✅ La asignación se guardó correctamente en la BD');
                } else {
                    console.log('❌ La asignación no se guardó en la BD');
                }

                // Limpiar
                await prisma.guest.delete({ where: { id: testGuest.id } });
            } else {
                console.log('❌ Falló asignar invitado');
            }
        } else {
            console.log('⚠️  No hay suficientes usuarios para probar asignación');
        }
    } catch (error) {
        console.log('❌ Error en test de asignación:', error.message);
    }

    // Test 7: Eliminar invitado
    console.log('\nTest 7: Eliminar invitado');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        // Crear invitado para eliminar
        const testGuest = await prisma.guest.create({
            data: {
                name: `Invitado para Eliminar ${Date.now()}`,
                phone: `555${Date.now().toString().slice(-7)}`,
                invitedById: adminUser.id,
                status: 'NUEVO'
            }
        });

        const req = mockRequest({}, { id: testGuest.id.toString() }, adminUser);
        const res = mockResponse();
        await guestController.deleteGuest(req, res);

        if (res.statusCode === 200) {
            console.log('✅ Invitado eliminado correctamente');
            
            // Verificar que no existe en la BD
            const deletedGuest = await prisma.guest.findUnique({
                where: { id: testGuest.id }
            });
            
            if (!deletedGuest) {
                console.log('✅ Invitado fue eliminado permanentemente de la BD');
            } else {
                console.log('❌ Invitado todavía existe en la BD');
            }
        } else {
            console.log('❌ Falló eliminar invitado');
            // Limpiar manualmente si falló
            await prisma.guest.delete({ where: { id: testGuest.id } });
        }
    } catch (error) {
        console.log('❌ Error en test de eliminar invitado:', error.message);
    }

    // Test 8: Estadísticas de invitados
    console.log('\nTest 8: Estadísticas de invitados');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const req = mockRequest({}, {}, adminUser);
        const res = mockResponse();
        await guestController.getGuestStats(req, res);

        if (res.statusCode === 200 && res.data.stats) {
            console.log('✅ Estadísticas obtenidas correctamente');
            
            // Verificar estructura de estadísticas
            if (res.data.stats.total !== undefined && 
                res.data.stats.byStatus && 
                res.data.stats.byMonth) {
                console.log('✅ Las estadísticas tienen la estructura correcta');
            } else {
                console.log('❌ Las estadísticas no tienen la estructura correcta');
            }
        } else {
            console.log('❌ Falló obtener estadísticas');
        }
    } catch (error) {
        console.log('❌ Error en test de estadísticas:', error.message);
    }

    console.log('\n=== FIN DE PRUEBAS DE INVITADOS ===');
}

// Ejecutar pruebas
testGuestsModule()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
