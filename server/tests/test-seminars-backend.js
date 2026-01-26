const { PrismaClient } = require('@prisma/client');
const seminarController = require('../controllers/seminarController');

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

async function testSeminarsModule() {
    console.log('=== PRUEBAS DEL MÓDULO DE SEMINARIOS ===\n');

    // Test 1: Obtener todos los módulos de seminario
    console.log('Test 1: Obtener todos los módulos de seminario');
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
        await seminarController.getAllModules(req, res);

        // seminarController.getAllModules devuelve un array directo
        if (res.statusCode === 200 && Array.isArray(res.data)) {
            console.log(`✅ Obtuvo ${res.data.length} módulos correctamente`);
            
            // Verificar estructura de datos
            if (res.data.length > 0) {
                const firstModule = res.data[0];
                if (firstModule.name && firstModule.type) {
                    console.log('✅ Los módulos tienen los campos requeridos');
                } else {
                    console.log('❌ Los módulos no tienen todos los campos requeridos');
                }
            }
        } else {
            console.log('❌ Falló obtener módulos');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de obtener módulos:', error.message);
    }

    // Test 2: Crear nuevo módulo de seminario
    console.log('\nTest 2: Crear nuevo módulo de seminario');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const professorUser = await prisma.user.findFirst({
            where: { role: 'PROFESOR' }
        });

        const testModuleData = {
            name: `Módulo de Prueba ${Date.now()}`,
            description: 'Descripción de prueba',
            moduleNumber: 999,
            type: 'SEMINARIO',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días después
            professorId: professorUser?.id || null
        };

        const req = mockRequest(testModuleData, {}, adminUser);
        const res = mockResponse();
        await seminarController.createModule(req, res);

        // createModule devuelve el módulo directamente
        if (res.statusCode === 201 && res.data && res.data.id) {
            console.log('✅ Módulo creado correctamente');
            console.log(`   ID: ${res.data.id}, Nombre: ${res.data.name}`);
            
            // Verificar que se guardó correctamente
            if (res.data.name === testModuleData.name) {
                console.log('✅ Módulo guardado correctamente en la BD');
            } else {
                console.log('❌ Módulo no guardado correctamente en la BD');
            }

            // Limpiar: eliminar el módulo de prueba
            await prisma.seminarModule.delete({
                where: { id: res.data.id }
            });
            console.log('✅ Módulo de prueba eliminado');
        } else {
            console.log('❌ Falló crear módulo');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de crear módulo:', error.message);
    }

    // Test 3: Validación de campos requeridos
    console.log('\nTest 3: Validación de campos requeridos');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const req = mockRequest({}, {}, adminUser); // Sin datos requeridos
        const res = mockResponse();
        await seminarController.createModule(req, res);

        if (res.statusCode === 400) {
            console.log('✅ Valida correctamente campos requeridos');
        } else {
            console.log('❌ No valida campos requeridos');
        }
    } catch (error) {
        console.log('❌ Error en test de validación:', error.message);
    }

    // Test 4: Actualizar módulo
    console.log('\nTest 4: Actualizar módulo');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        // Crear módulo para actualizar
        const testModule = await prisma.seminarModule.create({
            data: {
                name: `Módulo para Actualizar ${Date.now()}`,
                type: 'SEMINARIO'
            }
        });

        const req = mockRequest({
            name: 'Módulo Actualizado',
            description: 'Descripción actualizada',
            moduleNumber: 888
        }, { id: testModule.id.toString() }, adminUser);

        const res = mockResponse();
        await seminarController.updateModule(req, res);

        // updateModule devuelve el módulo directamente
        if (res.statusCode === 200 && res.data && res.data.id) {
            console.log('✅ Módulo actualizado correctamente');
            
            // Verificar que se actualizó en la BD
            const updatedModule = await prisma.seminarModule.findUnique({
                where: { id: testModule.id }
            });
            
            if (updatedModule.name === 'Módulo Actualizado') {
                console.log('✅ Los cambios se guardaron correctamente en la BD');
            } else {
                console.log('❌ Los cambios no se guardaron en la BD');
            }

            // Limpiar
            await prisma.seminarModule.delete({ where: { id: testModule.id } });
        } else {
            console.log('❌ Falló actualizar módulo');
        }
    } catch (error) {
        console.log('❌ Error en test de actualizar módulo:', error.message);
    }

    // Test 5: Inscribir usuario en módulo
    console.log('\nTest 5: Inscribir usuario en módulo');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const studentUser = await prisma.user.findFirst({
            where: { role: 'DISCIPULO' }
        });

        // Crear módulo para inscripción
        const testModule = await prisma.seminarModule.create({
            data: {
                name: `Módulo para Inscripción ${Date.now()}`,
                type: 'SEMINARIO'
            }
        });

        const req = mockRequest({
            userId: studentUser.id
        }, { moduleId: testModule.id.toString() }, adminUser);

        const res = mockResponse();
        await seminarController.enrollStudent(req, res);

        // enrollStudent devuelve el enrollment directamente
        if (res.statusCode === 201 && res.data && res.data.id) {
            console.log('✅ Usuario inscrito correctamente en el módulo');
            
            // Verificar que se inscribió en la BD
            const enrollment = await prisma.seminarEnrollment.findUnique({
                where: { 
                    userId_moduleId: {
                        userId: studentUser.id,
                        moduleId: testModule.id
                    }
                }
            });
            
            if (enrollment) {
                console.log('✅ La inscripción se guardó correctamente en la BD');
            } else {
                console.log('❌ La inscripción no se guardó en la BD');
            }

            // Limpiar
            await prisma.seminarEnrollment.delete({
                where: { id: res.data.id }
            });
            await prisma.seminarModule.delete({ where: { id: testModule.id } });
        } else {
            console.log('❌ Falló inscribir usuario en módulo');
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

        const studentUser = await prisma.user.findFirst({
            where: { role: 'DISCIPULO' }
        });

        // Crear módulo
        const testModule = await prisma.seminarModule.create({
            data: {
                name: `Módulo para Duplicación ${Date.now()}`,
                type: 'SEMINARIO'
            }
        });

        // Primera inscripción
        await prisma.seminarEnrollment.create({
            data: {
                userId: studentUser.id,
                moduleId: testModule.id
            }
        });

        // Intentar segunda inscripción (debería fallar)
        const req = mockRequest({
            userId: studentUser.id
        }, { moduleId: testModule.id.toString() }, adminUser);

        const res = mockResponse();
        await seminarController.enrollStudent(req, res);

        if (res.statusCode === 400) {
            console.log('✅ Rechazó correctamente inscripción duplicada');
        } else {
            console.log('❌ No rechazó inscripción duplicada');
        }

        // Limpiar
        await prisma.seminarEnrollment.deleteMany({
            where: { moduleId: testModule.id }
        });
        await prisma.seminarModule.delete({ where: { id: testModule.id } });
    } catch (error) {
        console.log('❌ Error en test de duplicación:', error.message);
    }

    // Test 7: Obtener inscripciones de un módulo
    console.log('\nTest 7: Obtener inscripciones de un módulo');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const testModule = await prisma.seminarModule.create({
            data: {
                name: `Módulo para consultar inscripciones ${Date.now()}`,
                type: 'SEMINARIO'
            }
        });

        const req = mockRequest({}, { moduleId: testModule.id.toString() }, adminUser);
        const res = mockResponse();
        await seminarController.getModuleEnrollments(req, res);

        if (res.statusCode === 200 && Array.isArray(res.data)) {
            console.log(`✅ Obtuvo ${res.data.length} inscripciones del módulo correctamente`);
        } else {
            console.log('❌ Falló obtener inscripciones del módulo');
            console.log('Response:', res.data);
        }

        await prisma.seminarModule.delete({ where: { id: testModule.id } });
    } catch (error) {
        console.log('❌ Error en test de obtener inscripciones del módulo:', error.message);
    }

    // Test 9: Eliminar módulo
    console.log('\nTest 9: Eliminar módulo');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        // Crear módulo para eliminar
        const testModule = await prisma.seminarModule.create({
            data: {
                name: `Módulo para Eliminar ${Date.now()}`,
                type: 'SEMINARIO'
            }
        });

        const req = mockRequest({}, { id: testModule.id.toString() }, adminUser);
        const res = mockResponse();
        await seminarController.deleteModule(req, res);

        if (res.statusCode === 200) {
            console.log('✅ Módulo eliminado correctamente');
            
            // Verificar que no existe en la BD
            const deletedModule = await prisma.seminarModule.findUnique({
                where: { id: testModule.id }
            });
            
            if (!deletedModule) {
                console.log('✅ Módulo fue eliminado permanentemente de la BD');
            } else {
                console.log('❌ Módulo todavía existe en la BD');
            }
        } else {
            console.log('❌ Falló eliminar módulo');
            // Limpiar manualmente si falló
            await prisma.seminarModule.delete({ where: { id: testModule.id } });
        }
    } catch (error) {
        console.log('❌ Error en test de eliminar módulo:', error.message);
    }

    // Test 10: Estadísticas de seminarios
    console.log('\nTest 10: Estadísticas de seminarios');
    console.log('⚠️  seminarController no expone getSeminarStats actualmente (test omitido)');

    console.log('\n=== FIN DE PRUEBAS DE SEMINARIOS ===');
}

// Ejecutar pruebas
testSeminarsModule()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
