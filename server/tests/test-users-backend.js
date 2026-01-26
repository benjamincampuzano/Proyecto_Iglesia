const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const userController = require('../controllers/userController');

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

async function testUsersModule() {
    console.log('=== PRUEBAS DEL MÓDULO DE USUARIOS ===\n');

    // Test 1: Obtener todos los usuarios (como ADMIN)
    console.log('Test 1: Obtener todos los usuarios (como ADMIN)');
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
        await userController.getAllUsers(req, res);

        if (res.statusCode === 200 && res.data.users) {
            console.log(`✅ Obtuvo ${res.data.users.length} usuarios correctamente`);
            
            // Verificar que incluye información necesaria
            const firstUser = res.data.users[0];
            if (firstUser && firstUser.id && firstUser.email && firstUser.role) {
                console.log('✅ Los usuarios tienen los campos requeridos');
            } else {
                console.log('❌ Los usuarios no tienen todos los campos requeridos');
            }
        } else {
            console.log('❌ Falló obtener usuarios');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de obtener usuarios:', error.message);
    }

    // Test 2: Obtener usuarios con filtro de rol
    console.log('\nTest 2: Obtener usuarios con filtro de rol');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const req = mockRequest({ role: 'LIDER_DOCE' }, {}, adminUser);
        const res = mockResponse();
        await userController.getAllUsers(req, res);

        if (res.statusCode === 200 && res.data.users) {
            const allAreLiderDoce = res.data.users.every(user => user.role === 'LIDER_DOCE');
            if (allAreLiderDoce) {
                console.log('✅ Filtró correctamente por rol LIDER_DOCE');
            } else {
                console.log('❌ No filtró correctamente por rol');
            }
        } else {
            console.log('❌ Falló filtrar por rol');
        }
    } catch (error) {
        console.log('❌ Error en test de filtro por rol:', error.message);
    }

    // Test 3: Crear nuevo usuario
    console.log('\nTest 3: Crear nuevo usuario');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const testUserEmail = `testuser_${Date.now()}@test.com`;
        const req = mockRequest({
            email: testUserEmail,
            password: 'test123',
            fullName: 'Usuario de Prueba',
            role: 'DISCIPULO'
        }, {}, adminUser);

        const res = mockResponse();
        await userController.createUser(req, res);

        if (res.statusCode === 201 && res.data.user) {
            console.log('✅ Usuario creado correctamente');
            console.log(`   ID: ${res.data.user.id}, Email: ${res.data.user.email}`);

            // Limpiar: eliminar el usuario de prueba
            await prisma.user.delete({
                where: { id: res.data.user.id }
            });
            console.log('✅ Usuario de prueba eliminado');
        } else {
            console.log('❌ Falló crear usuario');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de crear usuario:', error.message);
    }

    // Test 4: Validación de email único
    console.log('\nTest 4: Validación de email único');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        // Intentar crear usuario con email existente
        const req = mockRequest({
            email: adminUser.email,
            password: 'test123',
            fullName: 'Usuario Duplicado'
        }, {}, adminUser);

        const res = mockResponse();
        await userController.createUser(req, res);

        if (res.statusCode === 400) {
            console.log('✅ Rechazó correctamente email duplicado');
        } else {
            console.log('❌ No rechazó email duplicado');
        }
    } catch (error) {
        console.log('❌ Error en test de email único:', error.message);
    }

    // Test 5: Actualizar usuario
    console.log('\nTest 5: Actualizar usuario');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        // Crear usuario para actualizar
        const testUser = await prisma.user.create({
            data: {
                email: `updatetest_${Date.now()}@test.com`,
                password: await bcrypt.hash('test123', 10),
                fullName: 'Usuario para Actualizar',
                role: 'DISCIPULO'
            }
        });

        const req = mockRequest({
            fullName: 'Usuario Actualizado',
            role: 'LIDER_CELULA'
        }, { id: testUser.id.toString() }, adminUser);

        const res = mockResponse();
        await userController.updateUser(req, res);

        if (res.statusCode === 200 && res.data.user) {
            console.log('✅ Usuario actualizado correctamente');
            
            // Verificar que se actualizó en la BD
            const updatedUser = await prisma.user.findUnique({
                where: { id: testUser.id }
            });
            
            if (updatedUser.fullName === 'Usuario Actualizado') {
                console.log('✅ Los cambios se guardaron correctamente en la BD');
            } else {
                console.log('❌ Los cambios no se guardaron en la BD');
            }

            // Limpiar
            await prisma.user.delete({ where: { id: testUser.id } });
        } else {
            console.log('❌ Falló actualizar usuario');
        }
    } catch (error) {
        console.log('❌ Error en test de actualizar usuario:', error.message);
    }

    // Test 6: Seguridad por rol - LIDER_DOCE solo ve su red
    console.log('\nTest 6: Seguridad por rol - LIDER_DOCE solo ve su red');
    try {
        const liderDoceUser = await prisma.user.findFirst({
            where: { role: 'LIDER_DOCE' }
        });

        if (liderDoceUser) {
            const req = mockRequest({}, {}, liderDoceUser);
            const res = mockResponse();
            await userController.getAllUsers(req, res);

            if (res.statusCode === 200 && res.data.users) {
                // Verificar que solo ve usuarios de su red
                const canSeeAll = res.data.users.some(user => user.role === 'ADMIN');
                if (!canSeeAll) {
                    console.log('✅ LIDER_DOCE no ve usuarios fuera de su red');
                } else {
                    console.log('❌ LIDER_DOCE ve usuarios que no debería');
                }
            }
        } else {
            console.log('⚠️  No hay usuario LIDER_DOCE para probar seguridad');
        }
    } catch (error) {
        console.log('❌ Error en test de seguridad por rol:', error.message);
    }

    // Test 7: Eliminar usuario
    console.log('\nTest 7: Eliminar usuario');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        // Crear usuario para eliminar
        const testUser = await prisma.user.create({
            data: {
                email: `deletetest_${Date.now()}@test.com`,
                password: await bcrypt.hash('test123', 10),
                fullName: 'Usuario para Eliminar',
                role: 'DISCIPULO'
            }
        });

        const req = mockRequest({}, { id: testUser.id.toString() }, adminUser);
        const res = mockResponse();
        await userController.deleteUser(req, res);

        if (res.statusCode === 200) {
            console.log('✅ Usuario eliminado correctamente');
            
            // Verificar que no existe en la BD
            const deletedUser = await prisma.user.findUnique({
                where: { id: testUser.id }
            });
            
            if (!deletedUser) {
                console.log('✅ Usuario fue eliminado permanentemente de la BD');
            } else {
                console.log('❌ Usuario todavía existe en la BD');
            }
        } else {
            console.log('❌ Falló eliminar usuario');
            // Limpiar manualmente si falló
            await prisma.user.delete({ where: { id: testUser.id } });
        }
    } catch (error) {
        console.log('❌ Error en test de eliminar usuario:', error.message);
    }

    console.log('\n=== FIN DE PRUEBAS DE USUARIOS ===');
}

// Ejecutar pruebas
testUsersModule()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
