const { PrismaClient } = require('@prisma/client');
const networkController = require('../controllers/networkController');

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

async function testNetworkModule() {
    console.log('=== PRUEBAS DEL MÓDULO DE RED ===\n');

    // Test 1: Obtener red de un líder
    console.log('Test 1: Obtener red de un líder');
    try {
        const liderDoceUser = await prisma.user.findFirst({
            where: { role: 'LIDER_DOCE' }
        });

        if (!liderDoceUser) {
            console.log('❌ No hay usuario LIDER_DOCE en la BD');
            return;
        }

        const req = mockRequest({}, { userId: liderDoceUser.id.toString() }, liderDoceUser);
        const res = mockResponse();
        await networkController.getNetwork(req, res);

        // networkController.getNetwork devuelve un objeto jerárquico, no un array
        if (res.statusCode === 200 && res.data && typeof res.data === 'object') {
            console.log('✅ Obtuvo red correctamente');

            // Verificar estructura mínima
            if (res.data.id && res.data.fullName && res.data.role && Array.isArray(res.data.disciples)) {
                console.log('✅ La red tiene la estructura correcta (root + disciples)');
            } else {
                console.log('❌ La red no tiene la estructura esperada');
            }
        } else {
            console.log('❌ Falló obtener red');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de obtener red:', error.message);
    }

    // Test 2: Asignar usuario a líder
    console.log('\nTest 2: Asignar usuario a líder');
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

        if (!adminUser || !leaderUser || !memberUser) {
            console.log('❌ No hay suficientes usuarios para probar asignación');
            return;
        }

        const req = mockRequest({
            userId: memberUser.id,
            leaderId: leaderUser.id
        }, {}, adminUser);

        const res = mockResponse();
        await networkController.assignUserToLeader(req, res);

        if (res.statusCode === 200 && res.data.user) {
            console.log('✅ Usuario asignado correctamente al líder');
            
            // Verificar que se actualizó en la BD
            const updatedUser = await prisma.user.findUnique({
                where: { id: memberUser.id }
            });
            
            if (updatedUser.leaderId === leaderUser.id) {
                console.log('✅ La asignación se guardó correctamente en la BD');
            } else {
                console.log('❌ La asignación no se guardó en la BD');
            }

            // Limpiar: remover asignación
            await prisma.user.update({
                where: { id: memberUser.id },
                data: { leaderId: null }
            });
        } else {
            console.log('❌ Falló asignar usuario a líder');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de asignar usuario:', error.message);
    }

    // Test 3: Validación de asignación - no se puede asignar a ADMIN
    console.log('\nTest 3: Validación - no se puede asignar líder a ADMIN');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const leaderUser = await prisma.user.findFirst({
            where: { role: 'LIDER_DOCE' }
        });

        if (adminUser && leaderUser) {
            const req = mockRequest({
                userId: adminUser.id,
                leaderId: leaderUser.id
            }, {}, adminUser);

            const res = mockResponse();
            await networkController.assignUserToLeader(req, res);

            if (res.statusCode === 400) {
                console.log('✅ Rechazó correctamente asignar ADMIN a líder');
            } else {
                console.log('❌ No rechazó asignar ADMIN a líder');
            }
        } else {
            console.log('⚠️  No hay suficientes usuarios para probar validación');
        }
    } catch (error) {
        console.log('❌ Error en test de validación:', error.message);
    }

    // Test 4: Remover usuario de la red
    console.log('\nTest 4: Remover usuario de la red');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const leaderUser = await prisma.user.findFirst({
            where: { role: 'LIDER_DOCE' }
        });

        const memberUser = await prisma.user.findFirst({
            where: { role: 'DISCIPULO' }
        });

        if (!adminUser || !leaderUser || !memberUser) {
            console.log('❌ No hay suficientes usuarios para probar remoción');
            return;
        }

        // Primero asignar el usuario usando el controller (usa jerarquía nueva)
        const assignReq = mockRequest({
            userId: memberUser.id,
            leaderId: leaderUser.id
        }, {}, adminUser);
        const assignRes = mockResponse();
        await networkController.assignUserToLeader(assignReq, assignRes);

        const req = mockRequest({}, { userId: memberUser.id.toString() }, adminUser);
        const res = mockResponse();
        await networkController.removeUserFromNetwork(req, res);

        if (res.statusCode === 200) {
            console.log('✅ Usuario removido correctamente de la red');
            
            // Verificar que se actualizó en la BD
            const updatedUser = await prisma.user.findUnique({
                where: { id: memberUser.id }
            });
            
            if (updatedUser.pastorId === null && updatedUser.liderDoceId === null && updatedUser.liderCelulaId === null) {
                console.log('✅ La remoción se guardó correctamente en la BD');
            } else {
                console.log('❌ La remoción no se guardó en la BD');
            }
        } else {
            console.log('❌ Falló remover usuario de la red');
        }
    } catch (error) {
        console.log('❌ Error en test de remover usuario:', error.message);
    }

    // Test 5: Seguridad - PASTOR no puede asignar usuarios
    console.log('\nTest 5: Seguridad - PASTOR no puede asignar usuarios');
    try {
        const pastorUser = await prisma.user.findFirst({
            where: { role: 'PASTOR' }
        });

        const leaderUser = await prisma.user.findFirst({
            where: { role: 'LIDER_DOCE' }
        });

        const memberUser = await prisma.user.findFirst({
            where: { role: 'DISCIPULO' }
        });

        if (pastorUser && leaderUser && memberUser) {
            const req = mockRequest({
                userId: memberUser.id,
                leaderId: leaderUser.id
            }, {}, pastorUser);

            const res = mockResponse();
            await networkController.assignUserToLeader(req, res);

            if (res.statusCode === 403) {
                console.log('✅ PASTOR correctamente denegado para asignar usuarios');
            } else {
                console.log('❌ PASTOR no fue denegado para asignar usuarios');
            }
        } else {
            console.log('⚠️  No hay suficientes usuarios para probar seguridad de PASTOR');
        }
    } catch (error) {
        console.log('❌ Error en test de seguridad PASTOR:', error.message);
    }

    // Test 6: Seguridad - LIDER_CELULA solo puede asignar DISCIPULOS
    console.log('\nTest 6: Seguridad - LIDER_CELULA solo puede asignar DISCIPULOS');
    try {
        const liderCelulaUser = await prisma.user.findFirst({
            where: { role: 'LIDER_CELULA' }
        });

        const otherLeaderUser = await prisma.user.findFirst({
            where: { role: 'LIDER_DOCE' }
        });

        const memberUser = await prisma.user.findFirst({
            where: { role: 'DISCIPULO' }
        });

        if (liderCelulaUser && otherLeaderUser && memberUser) {
            // Intentar asignar un LIDER_DOCE (debería fallar)
            const req = mockRequest({
                userId: otherLeaderUser.id,
                leaderId: liderCelulaUser.id
            }, {}, liderCelulaUser);

            const res = mockResponse();
            await networkController.assignUserToLeader(req, res);

            if (res.statusCode === 400) {
                console.log('✅ LIDER_CELULA correctamente denegado para asignar LIDER_DOCE');
            } else {
                console.log('❌ LIDER_CELULA no fue denegado para asignar LIDER_DOCE');
            }

            // Ahora intentar asignar DISCIPULO (debería funcionar si está en su red)
            const req2 = mockRequest({
                userId: memberUser.id,
                leaderId: liderCelulaUser.id
            }, {}, liderCelulaUser);

            const res2 = mockResponse();
            await networkController.assignUserToLeader(req2, res2);

            // Puede ser 200 o 403 dependiendo de si el discípulo está en su red
            if (res2.statusCode === 200 || res2.statusCode === 403) {
                console.log('✅ LIDER_CELULA maneja correctamente asignación de DISCIPULO');
            } else {
                console.log('❌ LIDER_CELULA no maneja correctamente asignación de DISCIPULO');
            }
        } else {
            console.log('⚠️  No hay suficientes usuarios para probar seguridad de LIDER_CELULA');
        }
    } catch (error) {
        console.log('❌ Error en test de seguridad LIDER_CELULA:', error.message);
    }

    // Test 7: Obtener estadísticas de red
    console.log('\nTest 7: Obtener estadísticas de red');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const req = mockRequest({}, {}, adminUser);
        const res = mockResponse();
        await networkController.getNetworkStats(req, res);

        if (res.statusCode === 200 && res.data.stats) {
            console.log('✅ Estadísticas de red obtenidas correctamente');
            
            // Verificar estructura de estadísticas
            if (res.data.stats.totalUsers !== undefined && 
                res.data.stats.byRole && 
                res.data.stats.networkDepth) {
                console.log('✅ Las estadísticas tienen la estructura correcta');
            } else {
                console.log('❌ Las estadísticas no tienen la estructura correcta');
            }
        } else {
            console.log('❌ Falló obtener estadísticas de red');
        }
    } catch (error) {
        console.log('❌ Error en test de estadísticas de red:', error.message);
    }

    // Test 8: Validación de jerarquía - no ciclos
    console.log('\nTest 8: Validación de jerarquía - previene ciclos');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const leaderUser = await prisma.user.findFirst({
            where: { role: 'LIDER_DOCE' }
        });

        const subordinateUser = await prisma.user.findFirst({
            where: { role: 'LIDER_CELULA' }
        });

        if (adminUser && leaderUser && subordinateUser) {
            // Primero asignar subordinateUser a leaderUser
            await prisma.user.update({
                where: { id: subordinateUser.id },
                data: { leaderId: leaderUser.id }
            });

            // Ahora intentar asignar leaderUser a subordinateUser (debería fallar)
            const req = mockRequest({
                userId: leaderUser.id,
                leaderId: subordinateUser.id
            }, {}, adminUser);

            const res = mockResponse();
            await networkController.assignUserToLeader(req, res);

            if (res.statusCode === 400) {
                console.log('✅ Previno correctamente ciclo en la jerarquía');
            } else {
                console.log('❌ No previno ciclo en la jerarquía');
            }

            // Limpiar
            await prisma.user.update({
                where: { id: subordinateUser.id },
                data: { leaderId: null }
            });
        } else {
            console.log('⚠️  No hay suficientes usuarios para probar validación de jerarquía');
        }
    } catch (error) {
        console.log('❌ Error en test de validación de jerarquía:', error.message);
    }

    console.log('\n=== FIN DE PRUEBAS DE RED ===');
}

// Ejecutar pruebas
testNetworkModule()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
