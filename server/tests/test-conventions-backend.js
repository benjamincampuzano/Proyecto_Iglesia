const { PrismaClient } = require('@prisma/client');
const conventionController = require('../controllers/conventionController');

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

async function testConventionsModule() {
    console.log('=== PRUEBAS DEL MÓDULO DE CONVENCIONES ===\n');

    // Test 1: Obtener todas las convenciones
    console.log('Test 1: Obtener todas las convenciones');
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
        await conventionController.getAllConventions(req, res);

        if (res.statusCode === 200 && res.data.conventions) {
            console.log(`✅ Obtuvo ${res.data.conventions.length} convenciones correctamente`);
            
            // Verificar estructura de datos
            if (res.data.conventions.length > 0) {
                const firstConvention = res.data.conventions[0];
                if (firstConvention.type && firstConvention.year && firstConvention.cost) {
                    console.log('✅ Las convenciones tienen los campos requeridos');
                } else {
                    console.log('❌ Las convenciones no tienen todos los campos requeridos');
                }
            }
        } else {
            console.log('❌ Falló obtener convenciones');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de obtener convenciones:', error.message);
    }

    // Test 2: Crear nueva convención
    console.log('\nTest 2: Crear nueva convención');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const testConventionData = {
            type: 'FAMILIAS',
            year: new Date().getFullYear(),
            theme: 'Tema de prueba',
            cost: 200.0,
            startDate: new Date(),
            endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 días después
            liderDoceIds: [] // Array vacío inicialmente
        };

        const req = mockRequest(testConventionData, {}, adminUser);
        const res = mockResponse();
        await conventionController.createConvention(req, res);

        if (res.statusCode === 201 && res.data.convention) {
            console.log('✅ Convención creada correctamente');
            console.log(`   ID: ${res.data.convention.id}, Tipo: ${res.data.convention.type}`);
            
            // Verificar que se guardó correctamente
            if (res.data.convention.type === testConventionData.type) {
                console.log('✅ Convención guardada correctamente en la BD');
            } else {
                console.log('❌ Convención no guardada correctamente en la BD');
            }

            // Limpiar: eliminar la convención de prueba
            await prisma.convention.delete({
                where: { id: res.data.convention.id }
            });
            console.log('✅ Convención de prueba eliminada');
        } else {
            console.log('❌ Falló crear convención');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de crear convención:', error.message);
    }

    // Test 3: Validación de campos requeridos
    console.log('\nTest 3: Validación de campos requeridos');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const req = mockRequest({}, {}, adminUser); // Sin datos requeridos
        const res = mockResponse();
        await conventionController.createConvention(req, res);

        if (res.statusCode === 400) {
            console.log('✅ Valida correctamente campos requeridos');
        } else {
            console.log('❌ No valida campos requeridos');
        }
    } catch (error) {
        console.log('❌ Error en test de validación:', error.message);
    }

    // Test 4: Validación de duplicación (mismo tipo y año)
    console.log('\nTest 4: Validación de duplicación (mismo tipo y año)');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const currentYear = new Date().getFullYear();

        // Primera convención
        await prisma.convention.create({
            data: {
                type: 'MUJERES',
                year: currentYear,
                cost: 150.0,
                startDate: new Date(),
                endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            }
        });

        // Intentar crear segunda convención con mismo tipo y año (debería fallar)
        const req = mockRequest({
            type: 'MUJERES',
            year: currentYear,
            cost: 180.0,
            startDate: new Date(),
            endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        }, {}, adminUser);

        const res = mockResponse();
        await conventionController.createConvention(req, res);

        if (res.statusCode === 400) {
            console.log('✅ Rechazó correctamente convención duplicada');
        } else {
            console.log('❌ No rechazó convención duplicada');
        }

        // Limpiar
        await prisma.convention.deleteMany({
            where: { type: 'MUJERES', year: currentYear }
        });
    } catch (error) {
        console.log('❌ Error en test de duplicación:', error.message);
    }

    // Test 5: Actualizar convención
    console.log('\nTest 5: Actualizar convención');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        // Crear convención para actualizar
        const testConvention = await prisma.convention.create({
            data: {
                type: 'HOMBRES',
                year: new Date().getFullYear(),
                cost: 120.0,
                startDate: new Date(),
                endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            }
        });

        const req = mockRequest({
            theme: 'Tema actualizado',
            cost: 250.0,
            liderDoceIds: [1, 2] // Actualizar líderes
        }, { id: testConvention.id.toString() }, adminUser);

        const res = mockResponse();
        await conventionController.updateConvention(req, res);

        if (res.statusCode === 200 && res.data.convention) {
            console.log('✅ Convención actualizada correctamente');
            
            // Verificar que se actualizó en la BD
            const updatedConvention = await prisma.convention.findUnique({
                where: { id: testConvention.id }
            });
            
            if (updatedConvention.theme === 'Tema actualizado') {
                console.log('✅ Los cambios se guardaron correctamente en la BD');
            } else {
                console.log('❌ Los cambios no se guardaron en la BD');
            }

            // Limpiar
            await prisma.convention.delete({ where: { id: testConvention.id } });
        } else {
            console.log('❌ Falló actualizar convención');
        }
    } catch (error) {
        console.log('❌ Error en test de actualizar convención:', error.message);
    }

    // Test 6: Inscribir usuario en convención
    console.log('\nTest 6: Inscribir usuario en convención');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const memberUser = await prisma.user.findFirst({
            where: { role: 'DISCIPULO' }
        });

        // Crear convención para inscripción
        const testConvention = await prisma.convention.create({
            data: {
                type: 'JOVENES',
                year: new Date().getFullYear(),
                cost: 100.0,
                startDate: new Date(),
                endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            }
        });

        const req = mockRequest({
            userId: memberUser.id,
            discountPercentage: 15.0,
            needsTransport: true,
            needsAccommodation: false
        }, { conventionId: testConvention.id.toString() }, adminUser);

        const res = mockResponse();
        await conventionController.registerUser(req, res);

        if (res.statusCode === 201 && res.data.registration) {
            console.log('✅ Usuario inscrito correctamente en la convención');
            
            // Verificar que se inscribió en la BD
            const registration = await prisma.conventionRegistration.findUnique({
                where: { 
                    userId_conventionId: {
                        userId: memberUser.id,
                        conventionId: testConvention.id
                    }
                }
            });
            
            if (registration) {
                console.log('✅ La inscripción se guardó correctamente en la BD');
            } else {
                console.log('❌ La inscripción no se guardó en la BD');
            }

            // Limpiar
            await prisma.conventionRegistration.delete({
                where: { id: res.data.registration.id }
            });
            await prisma.convention.delete({ where: { id: testConvention.id } });
        } else {
            console.log('❌ Falló inscribir usuario en convención');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de inscripción:', error.message);
    }

    // Test 7: Validación de duplicación de inscripción
    console.log('\nTest 7: Validación de duplicación de inscripción');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const memberUser = await prisma.user.findFirst({
            where: { role: 'DISCIPULO' }
        });

        // Crear convención
        const testConvention = await prisma.convention.create({
            data: {
                type: 'FAMILIAS',
                year: new Date().getFullYear(),
                cost: 180.0,
                startDate: new Date(),
                endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            }
        });

        // Primera inscripción
        await prisma.conventionRegistration.create({
            data: {
                userId: memberUser.id,
                conventionId: testConvention.id
            }
        });

        // Intentar segunda inscripción (debería fallar)
        const req = mockRequest({
            userId: memberUser.id
        }, { conventionId: testConvention.id.toString() }, adminUser);

        const res = mockResponse();
        await conventionController.registerUser(req, res);

        if (res.statusCode === 400) {
            console.log('✅ Rechazó correctamente inscripción duplicada');
        } else {
            console.log('❌ No rechazó inscripción duplicada');
        }

        // Limpiar
        await prisma.conventionRegistration.deleteMany({
            where: { conventionId: testConvention.id }
        });
        await prisma.convention.delete({ where: { id: testConvention.id } });
    } catch (error) {
        console.log('❌ Error en test de duplicación:', error.message);
    }

    // Test 8: Obtener inscripciones de una convención
    console.log('\nTest 8: Obtener inscripciones de una convención');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        // Crear convención con inscripciones
        const testConvention = await prisma.convention.create({
            data: {
                type: 'MUJERES',
                year: new Date().getFullYear(),
                cost: 160.0,
                startDate: new Date(),
                endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            }
        });

        const req = mockRequest({}, { conventionId: testConvention.id.toString() }, adminUser);
        const res = mockResponse();
        await conventionController.getConventionRegistrations(req, res);

        if (res.statusCode === 200 && Array.isArray(res.data.registrations)) {
            console.log(`✅ Obtuvo ${res.data.registrations.length} inscripciones correctamente`);
            
            // Verificar estructura
            if (res.data.registrations.length > 0) {
                const firstRegistration = res.data.registrations[0];
                if (firstRegistration.user && firstRegistration.status) {
                    console.log('✅ Las inscripciones tienen la estructura correcta');
                } else {
                    console.log('❌ Las inscripciones no tienen la estructura correcta');
                }
            }
        } else {
            console.log('❌ Falló obtener inscripciones');
        }

        // Limpiar
        await prisma.convention.delete({ where: { id: testConvention.id } });
    } catch (error) {
        console.log('❌ Error en test de obtener inscripciones:', error.message);
    }

    // Test 9: Registrar pago de convención
    console.log('\nTest 9: Registrar pago de convención');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const memberUser = await prisma.user.findFirst({
            where: { role: 'DISCIPULO' }
        });

        // Crear convención e inscripción
        const testConvention = await prisma.convention.create({
            data: {
                type: 'HOMBRES',
                year: new Date().getFullYear(),
                cost: 200.0,
                startDate: new Date(),
                endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            }
        });

        const registration = await prisma.conventionRegistration.create({
            data: {
                userId: memberUser.id,
                conventionId: testConvention.id
            }
        });

        const paymentData = {
            amount: 100.0,
            notes: 'Pago parcial'
        };

        const req = mockRequest(paymentData, { registrationId: registration.id.toString() }, adminUser);
        const res = mockResponse();
        await conventionController.recordPayment(req, res);

        if (res.statusCode === 201 && res.data.payment) {
            console.log('✅ Pago registrado correctamente');
            
            // Verificar en BD
            const payment = await prisma.conventionPayment.findUnique({
                where: { id: res.data.payment.id }
            });
            
            if (payment && payment.amount === 100.0) {
                console.log('✅ El pago se guardó correctamente en la BD');
            } else {
                console.log('❌ El pago no se guardó en la BD');
            }

            // Limpiar
            await prisma.conventionPayment.deleteMany({
                where: { registrationId: registration.id }
            });
            await prisma.conventionRegistration.delete({
                where: { id: registration.id }
            });
            await prisma.convention.delete({ where: { id: testConvention.id } });
        } else {
            console.log('❌ Falló registrar pago');
        }
    } catch (error) {
        console.log('❌ Error en test de registrar pago:', error.message);
    }

    // Test 10: Eliminar convención
    console.log('\nTest 10: Eliminar convención');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        // Crear convención para eliminar
        const testConvention = await prisma.convention.create({
            data: {
                type: 'JOVENES',
                year: new Date().getFullYear(),
                cost: 140.0,
                startDate: new Date(),
                endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            }
        });

        const req = mockRequest({}, { id: testConvention.id.toString() }, adminUser);
        const res = mockResponse();
        await conventionController.deleteConvention(req, res);

        if (res.statusCode === 200) {
            console.log('✅ Convención eliminada correctamente');
            
            // Verificar que no existe en la BD
            const deletedConvention = await prisma.convention.findUnique({
                where: { id: testConvention.id }
            });
            
            if (!deletedConvention) {
                console.log('✅ Convención fue eliminada permanentemente de la BD');
            } else {
                console.log('❌ Convención todavía existe en la BD');
            }
        } else {
            console.log('❌ Falló eliminar convención');
            // Limpiar manualmente si falló
            await prisma.convention.delete({ where: { id: testConvention.id } });
        }
    } catch (error) {
        console.log('❌ Error en test de eliminar convención:', error.message);
    }

    // Test 11: Estadísticas de convenciones
    console.log('\nTest 11: Estadísticas de convenciones');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const req = mockRequest({}, {}, adminUser);
        const res = mockResponse();
        await conventionController.getConventionStats(req, res);

        if (res.statusCode === 200 && res.data.stats) {
            console.log('✅ Estadísticas de convenciones obtenidas correctamente');
            
            // Verificar estructura de estadísticas
            if (res.data.stats.totalConventions !== undefined && 
                res.data.stats.totalRegistrations && 
                res.data.stats.byType) {
                console.log('✅ Las estadísticas tienen la estructura correcta');
            } else {
                console.log('❌ Las estadísticas no tienen la estructura correcta');
            }
        } else {
            console.log('❌ Falló obtener estadísticas de convenciones');
        }
    } catch (error) {
        console.log('❌ Error en test de estadísticas de convenciones:', error.message);
    }

    console.log('\n=== FIN DE PRUEBAS DE CONVENCIONES ===');
}

// Ejecutar pruebas
testConventionsModule()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
