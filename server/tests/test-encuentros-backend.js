const { PrismaClient } = require('@prisma/client');
const encuentroController = require('../controllers/encuentroController');
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

async function testEncuentrosModule() {
    console.log('=== PRUEBAS DEL MÓDULO DE ENCUENTROS ===\n');

    // Test 1: Obtener todos los encuentros
    console.log('Test 1: Obtener todos los encuentros');
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
        await encuentroController.getAllEncuentros(req, res);

        if (res.statusCode === 200 && res.data.encuentros) {
            console.log(`✅ Obtuvo ${res.data.encuentros.length} encuentros correctamente`);
            
            // Verificar estructura de datos
            if (res.data.encuentros.length > 0) {
                const firstEncuentro = res.data.encuentros[0];
                if (firstEncuentro.name && firstEncuentro.type && firstEncuentro.startDate) {
                    console.log('✅ Los encuentros tienen los campos requeridos');
                } else {
                    console.log('❌ Los encuentros no tienen todos los campos requeridos');
                }
            }
        } else {
            console.log('❌ Falló obtener encuentros');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de obtener encuentros:', error.message);
    }

    // Test 2: Crear nuevo encuentro
    console.log('\nTest 2: Crear nuevo encuentro');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const coordinatorUser = await prisma.user.findFirst({
            where: { role: { in: ['ADMIN', 'LIDER_DOCE'] } }
        });

        const testEncuentroData = {
            name: `Encuentro de Prueba ${Date.now()}`,
            description: 'Descripción de prueba',
            type: 'MUJERES',
            cost: 100.0,
            startDate: new Date(),
            endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 días después
            coordinatorId: coordinatorUser?.id || null
        };

        const req = mockRequest(testEncuentroData, {}, adminUser);
        const res = mockResponse();
        await encuentroController.createEncuentro(req, res);

        if (res.statusCode === 201 && res.data.encuentro) {
            console.log('✅ Encuentro creado correctamente');
            console.log(`   ID: ${res.data.encuentro.id}, Nombre: ${res.data.encuentro.name}`);
            
            // Verificar que se guardó correctamente
            if (res.data.encuentro.name === testEncuentroData.name) {
                console.log('✅ Encuentro guardado correctamente en la BD');
            } else {
                console.log('❌ Encuentro no guardado correctamente en la BD');
            }

            // Limpiar: eliminar el encuentro de prueba
            await prisma.encuentro.delete({
                where: { id: res.data.encuentro.id }
            });
            console.log('✅ Encuentro de prueba eliminado');
        } else {
            console.log('❌ Falló crear encuentro');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de crear encuentro:', error.message);
    }

    // Test 3: Validación de campos requeridos
    console.log('\nTest 3: Validación de campos requeridos');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const req = mockRequest({}, {}, adminUser); // Sin datos requeridos
        const res = mockResponse();
        await encuentroController.createEncuentro(req, res);

        if (res.statusCode === 400) {
            console.log('✅ Valida correctamente campos requeridos');
        } else {
            console.log('❌ No valida campos requeridos');
        }
    } catch (error) {
        console.log('❌ Error en test de validación:', error.message);
    }

    // Test 4: Actualizar encuentro
    console.log('\nTest 4: Actualizar encuentro');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        // Crear encuentro para actualizar
        const testEncuentro = await prisma.encuentro.create({
            data: {
                name: `Encuentro para Actualizar ${Date.now()}`,
                type: 'HOMBRES',
                cost: 50.0,
                startDate: new Date(),
                endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            }
        });

        const req = mockRequest({
            name: 'Encuentro Actualizado',
            description: 'Descripción actualizada',
            cost: 150.0
        }, { id: testEncuentro.id.toString() }, adminUser);

        const res = mockResponse();
        await encuentroController.updateEncuentro(req, res);

        if (res.statusCode === 200 && res.data.encuentro) {
            console.log('✅ Encuentro actualizado correctamente');
            
            // Verificar que se actualizó en la BD
            const updatedEncuentro = await prisma.encuentro.findUnique({
                where: { id: testEncuentro.id }
            });
            
            if (updatedEncuentro.name === 'Encuentro Actualizado') {
                console.log('✅ Los cambios se guardaron correctamente en la BD');
            } else {
                console.log('❌ Los cambios no se guardaron en la BD');
            }

            // Limpiar
            await prisma.encuentro.delete({ where: { id: testEncuentro.id } });
        } else {
            console.log('❌ Falló actualizar encuentro');
        }
    } catch (error) {
        console.log('❌ Error en test de actualizar encuentro:', error.message);
    }

    // Test 5: Inscribir invitado en encuentro
    console.log('\nTest 5: Inscribir invitado en encuentro');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        // Crear encuentro para inscripción
        const testEncuentro = await prisma.encuentro.create({
            data: {
                name: `Encuentro para Inscripción ${Date.now()}`,
                type: 'JOVENES',
                cost: 75.0,
                startDate: new Date(),
                endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            }
        });

        // Crear invitado para inscribir
        const testGuest = await prisma.guest.create({
            data: {
                name: `Invitado para Encuentro ${Date.now()}`,
                phone: `555${Date.now().toString().slice(-7)}`,
                invitedById: adminUser.id,
                status: 'NUEVO'
            }
        });

        const req = mockRequest({
            guestId: testGuest.id,
            discountPercentage: 10.0
        }, { encuentroId: testEncuentro.id.toString() }, adminUser);

        const res = mockResponse();
        await encuentroController.registerGuest(req, res);

        if (res.statusCode === 201 && res.data.registration) {
            console.log('✅ Invitado inscrito correctamente en el encuentro');
            
            // Verificar que se inscribió en la BD
            const registration = await prisma.encuentroRegistration.findUnique({
                where: { 
                    guestId_encuentroId: {
                        guestId: testGuest.id,
                        encuentroId: testEncuentro.id
                    }
                }
            });
            
            if (registration) {
                console.log('✅ La inscripción se guardó correctamente en la BD');
            } else {
                console.log('❌ La inscripción no se guardó en la BD');
            }

            // Limpiar
            await prisma.encuentroRegistration.delete({
                where: { id: res.data.registration.id }
            });
            await prisma.guest.delete({ where: { id: testGuest.id } });
            await prisma.encuentro.delete({ where: { id: testEncuentro.id } });
        } else {
            console.log('❌ Falló inscribir invitado en encuentro');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de inscripción:', error.message);
    }

    // Test 6: Validación de duplicación de inscripción
    console.log('\nTest 6: Validación de duplicación de inscripción');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        // Crear encuentro
        const testEncuentro = await prisma.encuentro.create({
            data: {
                name: `Encuentro para Duplicación ${Date.now()}`,
                type: 'MUJERES',
                cost: 80.0,
                startDate: new Date(),
                endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            }
        });

        // Crear invitado
        const testGuest = await prisma.guest.create({
            data: {
                name: `Invitado para Duplicación ${Date.now()}`,
                phone: `555${Date.now().toString().slice(-7)}`,
                invitedById: adminUser.id,
                status: 'NUEVO'
            }
        });

        // Primera inscripción
        await prisma.encuentroRegistration.create({
            data: {
                guestId: testGuest.id,
                encuentroId: testEncuentro.id
            }
        });

        // Intentar segunda inscripción (debería fallar)
        const req = mockRequest({
            guestId: testGuest.id
        }, { encuentroId: testEncuentro.id.toString() }, adminUser);

        const res = mockResponse();
        await encuentroController.registerGuest(req, res);

        if (res.statusCode === 400) {
            console.log('✅ Rechazó correctamente inscripción duplicada');
        } else {
            console.log('❌ No rechazó inscripción duplicada');
        }

        // Limpiar
        await prisma.encuentroRegistration.deleteMany({
            where: { encuentroId: testEncuentro.id }
        });
        await prisma.guest.delete({ where: { id: testGuest.id } });
        await prisma.encuentro.delete({ where: { id: testEncuentro.id } });
    } catch (error) {
        console.log('❌ Error en test de duplicación:', error.message);
    }

    // Test 7: Registrar asistencia a clase de encuentro
    console.log('\nTest 7: Registrar asistencia a clase de encuentro');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        // Crear encuentro e inscripción
        const testEncuentro = await prisma.encuentro.create({
            data: {
                name: `Encuentro para Asistencia ${Date.now()}`,
                type: 'HOMBRES',
                cost: 90.0,
                startDate: new Date(),
                endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            }
        });

        const testGuest = await prisma.guest.create({
            data: {
                name: `Invitado para Asistencia ${Date.now()}`,
                phone: `555${Date.now().toString().slice(-7)}`,
                invitedById: adminUser.id,
                status: 'NUEVO'
            }
        });

        const registration = await prisma.encuentroRegistration.create({
            data: {
                guestId: testGuest.id,
                encuentroId: testEncuentro.id
            }
        });

        const req = mockRequest({
            classNumber: 1,
            attended: true
        }, { registrationId: registration.id.toString() }, adminUser);

        const res = mockResponse();
        await encuentroController.recordClassAttendance(req, res);

        if (res.statusCode === 201 && res.data.attendance) {
            console.log('✅ Asistencia a clase registrada correctamente');
            
            // Verificar en BD
            const attendance = await prisma.encuentroClassAttendance.findUnique({
                where: { 
                    registrationId_classNumber: {
                        registrationId: registration.id,
                        classNumber: 1
                    }
                }
            });
            
            if (attendance && attendance.attended === true) {
                console.log('✅ La asistencia se guardó correctamente en la BD');
            } else {
                console.log('❌ La asistencia no se guardó en la BD');
            }

            // Limpiar
            await prisma.encuentroClassAttendance.deleteMany({
                where: { registrationId: registration.id }
            });
            await prisma.encuentroRegistration.delete({
                where: { id: registration.id }
            });
            await prisma.guest.delete({ where: { id: testGuest.id } });
            await prisma.encuentro.delete({ where: { id: testEncuentro.id } });
        } else {
            console.log('❌ Falló registrar asistencia a clase');
        }
    } catch (error) {
        console.log('❌ Error en test de registrar asistencia:', error.message);
    }

    // Test 8: Obtener inscripciones de un encuentro
    console.log('\nTest 8: Obtener inscripciones de un encuentro');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        // Crear encuentro con inscripciones
        const testEncuentro = await prisma.encuentro.create({
            data: {
                name: `Encuentro para Inscripciones ${Date.now()}`,
                type: 'MUJERES',
                cost: 85.0,
                startDate: new Date(),
                endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            }
        });

        const req = mockRequest({}, { encuentroId: testEncuentro.id.toString() }, adminUser);
        const res = mockResponse();
        await encuentroController.getEncuentroRegistrations(req, res);

        if (res.statusCode === 200 && Array.isArray(res.data.registrations)) {
            console.log(`✅ Obtuvo ${res.data.registrations.length} inscripciones correctamente`);
            
            // Verificar estructura
            if (res.data.registrations.length > 0) {
                const firstRegistration = res.data.registrations[0];
                if (firstRegistration.guest && firstRegistration.status) {
                    console.log('✅ Las inscripciones tienen la estructura correcta');
                } else {
                    console.log('❌ Las inscripciones no tienen la estructura correcta');
                }
            }
        } else {
            console.log('❌ Falló obtener inscripciones');
        }

        // Limpiar
        await prisma.encuentro.delete({ where: { id: testEncuentro.id } });
    } catch (error) {
        console.log('❌ Error en test de obtener inscripciones:', error.message);
    }

    // Test 9: Eliminar encuentro
    console.log('\nTest 9: Eliminar encuentro');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        // Crear encuentro para eliminar
        const testEncuentro = await prisma.encuentro.create({
            data: {
                name: `Encuentro para Eliminar ${Date.now()}`,
                type: 'JOVENES',
                cost: 95.0,
                startDate: new Date(),
                endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            }
        });

        const req = mockRequest({}, { id: testEncuentro.id.toString() }, adminUser);
        const res = mockResponse();
        await encuentroController.deleteEncuentro(req, res);

        if (res.statusCode === 200) {
            console.log('✅ Encuentro eliminado correctamente');
            
            // Verificar que no existe en la BD
            const deletedEncuentro = await prisma.encuentro.findUnique({
                where: { id: testEncuentro.id }
            });
            
            if (!deletedEncuentro) {
                console.log('✅ Encuentro fue eliminado permanentemente de la BD');
            } else {
                console.log('❌ Encuentro todavía existe en la BD');
            }
        } else {
            console.log('❌ Falló eliminar encuentro');
            // Limpiar manualmente si falló
            await prisma.encuentro.delete({ where: { id: testEncuentro.id } });
        }
    } catch (error) {
        console.log('❌ Error en test de eliminar encuentro:', error.message);
    }

    // Test 10: Estadísticas de encuentros
    console.log('\nTest 10: Estadísticas de encuentros');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const req = mockRequest({}, {}, adminUser);
        const res = mockResponse();
        await encuentroController.getEncuentroStats(req, res);

        if (res.statusCode === 200 && res.data.stats) {
            console.log('✅ Estadísticas de encuentros obtenidas correctamente');
            
            // Verificar estructura de estadísticas
            if (res.data.stats.totalEncuentros !== undefined && 
                res.data.stats.totalRegistrations && 
                res.data.stats.byType) {
                console.log('✅ Las estadísticas tienen la estructura correcta');
            } else {
                console.log('❌ Las estadísticas no tienen la estructura correcta');
            }
        } else {
            console.log('❌ Falló obtener estadísticas de encuentros');
        }
    } catch (error) {
        console.log('❌ Error en test de estadísticas de encuentros:', error.message);
    }

    console.log('\n=== FIN DE PRUEBAS DE ENCUENTROS ===');
}

// Ejecutar pruebas
testEncuentrosModule()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
