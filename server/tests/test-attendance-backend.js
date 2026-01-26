const { PrismaClient } = require('@prisma/client');
const churchAttendanceController = require('../controllers/churchAttendanceController');
const cellAttendanceController = require('../controllers/cellAttendanceController');

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

async function testAttendanceModule() {
    console.log('=== PRUEBAS DEL MÓDULO DE ASISTENCIA ===\n');

    // Test 1: Registrar asistencia a servicio de iglesia
    console.log('Test 1: Registrar asistencia a servicio de iglesia');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const memberUser = await prisma.user.findFirst({
            where: { role: 'DISCIPULO' }
        });

        if (!adminUser || !memberUser) {
            console.log('❌ No hay usuarios suficientes para probar asistencia');
            return;
        }

        const attendanceData = {
            date: new Date(),
            status: 'PRESENTE'
        };

        const req = mockRequest(attendanceData, { userId: memberUser.id.toString() }, adminUser);
        const res = mockResponse();
        await churchAttendanceController.recordAttendance(req, res);

        if (res.statusCode === 201 && res.data.attendance) {
            console.log('✅ Asistencia a iglesia registrada correctamente');
            
            // Verificar que se guardó en la BD
            const attendance = await prisma.churchAttendance.findUnique({
                where: { 
                    date_userId: {
                        date: attendanceData.date,
                        userId: memberUser.id
                    }
                }
            });
            
            if (attendance && attendance.status === 'PRESENTE') {
                console.log('✅ La asistencia se guardó correctamente en la BD');
            } else {
                console.log('❌ La asistencia no se guardó en la BD');
            }

            // Limpiar
            await prisma.churchAttendance.delete({
                where: { id: res.data.attendance.id }
            });
        } else {
            console.log('❌ Falló registrar asistencia a iglesia');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de asistencia a iglesia:', error.message);
    }

    // Test 2: Validación de duplicación de asistencia a iglesia
    console.log('\nTest 2: Validación de duplicación de asistencia a iglesia');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const memberUser = await prisma.user.findFirst({
            where: { role: 'DISCIPULO' }
        });

        const attendanceDate = new Date();

        // Primera asistencia
        await prisma.churchAttendance.create({
            data: {
                date: attendanceDate,
                userId: memberUser.id,
                status: 'PRESENTE'
            }
        });

        // Segunda asistencia (debería fallar)
        const req = mockRequest({
            date: attendanceDate,
            status: 'AUSENTE'
        }, { userId: memberUser.id.toString() }, adminUser);

        const res = mockResponse();
        await churchAttendanceController.recordAttendance(req, res);

        if (res.statusCode === 400) {
            console.log('✅ Rechazó correctamente asistencia duplicada');
        } else {
            console.log('❌ No rechazó asistencia duplicada');
        }

        // Limpiar
        await prisma.churchAttendance.deleteMany({
            where: { userId: memberUser.id }
        });
    } catch (error) {
        console.log('❌ Error en test de duplicación de asistencia:', error.message);
    }

    // Test 3: Obtener asistencias de iglesia
    console.log('\nTest 3: Obtener asistencias de iglesia');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const req = mockRequest({}, {}, adminUser);
        const res = mockResponse();
        await churchAttendanceController.getAttendances(req, res);

        if (res.statusCode === 200 && res.data.attendances) {
            console.log(`✅ Obtuvo ${res.data.attendances.length} asistencias correctamente`);
            
            // Verificar estructura
            if (res.data.attendances.length > 0) {
                const firstAttendance = res.data.attendances[0];
                if (firstAttendance.date && firstAttendance.status && firstAttendance.user) {
                    console.log('✅ Las asistencias tienen la estructura correcta');
                } else {
                    console.log('❌ Las asistencias no tienen la estructura correcta');
                }
            }
        } else {
            console.log('❌ Falló obtener asistencias');
        }
    } catch (error) {
        console.log('❌ Error en test de obtener asistencias:', error.message);
    }

    // Test 4: Registrar asistencia a célula
    console.log('\nTest 4: Registrar asistencia a célula');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const leaderUser = await prisma.user.findFirst({
            where: { role: 'LIDER_CELULA' }
        });

        const memberUser = await prisma.user.findFirst({
            where: { role: 'DISCIPULO' }
        });

        // Crear célula para prueba
        const testCell = await prisma.cell.create({
            data: {
                name: `Célula para Asistencia ${Date.now()}`,
                leaderId: leaderUser.id
            }
        });

        const attendanceData = {
            date: new Date(),
            status: 'PRESENTE'
        };

        const req = mockRequest(attendanceData, { 
            cellId: testCell.id.toString(),
            userId: memberUser.id.toString()
        }, adminUser);

        const res = mockResponse();
        await cellAttendanceController.recordAttendance(req, res);

        if (res.statusCode === 201 && res.data.attendance) {
            console.log('✅ Asistencia a célula registrada correctamente');
            
            // Verificar que se guardó en la BD
            const attendance = await prisma.cellAttendance.findUnique({
                where: { 
                    date_cellId_userId: {
                        date: attendanceData.date,
                        cellId: testCell.id,
                        userId: memberUser.id
                    }
                }
            });
            
            if (attendance && attendance.status === 'PRESENTE') {
                console.log('✅ La asistencia a célula se guardó correctamente en la BD');
            } else {
                console.log('❌ La asistencia a célula no se guardó en la BD');
            }

            // Limpiar
            await prisma.cellAttendance.delete({
                where: { id: res.data.attendance.id }
            });
        } else {
            console.log('❌ Falló registrar asistencia a célula');
            console.log('Response:', res.data);
        }

        // Limpiar célula
        await prisma.cell.delete({ where: { id: testCell.id } });
    } catch (error) {
        console.log('❌ Error en test de asistencia a célula:', error.message);
    }

    // Test 5: Validación de campos requeridos en asistencia
    console.log('\nTest 5: Validación de campos requeridos en asistencia');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const memberUser = await prisma.user.findFirst({
            where: { role: 'DISCIPULO' }
        });

        const req = mockRequest({}, { userId: memberUser.id.toString() }, adminUser); // Sin datos requeridos
        const res = mockResponse();
        await churchAttendanceController.recordAttendance(req, res);

        if (res.statusCode === 400) {
            console.log('✅ Valida correctamente campos requeridos');
        } else {
            console.log('❌ No valida campos requeridos');
        }
    } catch (error) {
        console.log('❌ Error en test de validación:', error.message);
    }

    // Test 6: Actualizar asistencia
    console.log('\nTest 6: Actualizar asistencia');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const memberUser = await prisma.user.findFirst({
            where: { role: 'DISCIPULO' }
        });

        // Crear asistencia para actualizar
        const testAttendance = await prisma.churchAttendance.create({
            data: {
                date: new Date(),
                userId: memberUser.id,
                status: 'PRESENTE'
            }
        });

        const req = mockRequest({
            status: 'AUSENTE'
        }, { id: testAttendance.id.toString() }, adminUser);

        const res = mockResponse();
        await churchAttendanceController.updateAttendance(req, res);

        if (res.statusCode === 200 && res.data.attendance) {
            console.log('✅ Asistencia actualizada correctamente');
            
            // Verificar que se actualizó en la BD
            const updatedAttendance = await prisma.churchAttendance.findUnique({
                where: { id: testAttendance.id }
            });
            
            if (updatedAttendance.status === 'AUSENTE') {
                console.log('✅ La actualización se guardó correctamente en la BD');
            } else {
                console.log('❌ La actualización no se guardó en la BD');
            }

            // Limpiar
            await prisma.churchAttendance.delete({ where: { id: testAttendance.id } });
        } else {
            console.log('❌ Falló actualizar asistencia');
        }
    } catch (error) {
        console.log('❌ Error en test de actualizar asistencia:', error.message);
    }

    // Test 7: Estadísticas de asistencia
    console.log('\nTest 7: Estadísticas de asistencia');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const req = mockRequest({}, {}, adminUser);
        const res = mockResponse();
        await churchAttendanceController.getAttendanceStats(req, res);

        if (res.statusCode === 200 && res.data.stats) {
            console.log('✅ Estadísticas de asistencia obtenidas correctamente');
            
            // Verificar estructura de estadísticas
            if (res.data.stats.totalAttendances !== undefined && 
                res.data.stats.presentPercentage !== undefined && 
                res.data.stats.byMonth) {
                console.log('✅ Las estadísticas tienen la estructura correcta');
            } else {
                console.log('❌ Las estadísticas no tienen la estructura correcta');
            }
        } else {
            console.log('❌ Falló obtener estadísticas de asistencia');
        }
    } catch (error) {
        console.log('❌ Error en test de estadísticas de asistencia:', error.message);
    }

    // Test 8: Seguridad por rol - usuario solo ve sus asistencias
    console.log('\nTest 8: Seguridad por rol - usuario solo ve sus asistencias');
    try {
        const memberUser = await prisma.user.findFirst({
            where: { role: 'DISCIPULO' }
        });

        if (memberUser) {
            const req = mockRequest({}, {}, memberUser);
            const res = mockResponse();
            await churchAttendanceController.getAttendances(req, res);

            if (res.statusCode === 200 && res.data.attendances) {
                // Verificar que todas las asistencias son de este usuario
                const allAreHisAttendances = res.data.attendances.every(attendance => 
                    attendance.userId === memberUser.id
                );
                
                if (allAreHisAttendances || res.data.attendances.length === 0) {
                    console.log('✅ Usuario solo ve sus asistencias');
                } else {
                    console.log('❌ Usuario ve asistencias que no debería');
                }
            }
        } else {
            console.log('⚠️  No hay usuario DISCIPULO para probar seguridad');
        }
    } catch (error) {
        console.log('❌ Error en test de seguridad por rol:', error.message);
    }

    // Test 9: Asistencia múltiple (batch)
    console.log('\nTest 9: Asistencia múltiple (batch)');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const memberUsers = await prisma.user.findMany({
            where: { role: 'DISCIPULO' },
            take: 3
        });

        if (memberUsers.length >= 2) {
            const batchData = {
                date: new Date(),
                attendances: memberUsers.slice(0, 2).map(user => ({
                    userId: user.id,
                    status: 'PRESENTE'
                }))
            };

            const req = mockRequest(batchData, {}, adminUser);
            const res = mockResponse();
            await churchAttendanceController.recordBatchAttendance(req, res);

            if (res.statusCode === 201 && res.data.attendances) {
                console.log(`✅ Asistencia múltiple registrada correctamente (${res.data.attendances.length} registros)`);
                
                // Limpiar
                await prisma.churchAttendance.deleteMany({
                    where: { 
                        date: batchData.date,
                        userId: { in: memberUsers.slice(0, 2).map(u => u.id) }
                    }
                });
            } else {
                console.log('❌ Falló registrar asistencia múltiple');
            }
        } else {
            console.log('⚠️  No hay suficientes discípulos para probar asistencia múltiple');
        }
    } catch (error) {
        console.log('❌ Error en test de asistencia múltiple:', error.message);
    }

    // Test 10: Eliminar asistencia
    console.log('\nTest 10: Eliminar asistencia');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        const memberUser = await prisma.user.findFirst({
            where: { role: 'DISCIPULO' }
        });

        // Crear asistencia para eliminar
        const testAttendance = await prisma.churchAttendance.create({
            data: {
                date: new Date(),
                userId: memberUser.id,
                status: 'PRESENTE'
            }
        });

        const req = mockRequest({}, { id: testAttendance.id.toString() }, adminUser);
        const res = mockResponse();
        await churchAttendanceController.deleteAttendance(req, res);

        if (res.statusCode === 200) {
            console.log('✅ Asistencia eliminada correctamente');
            
            // Verificar que no existe en la BD
            const deletedAttendance = await prisma.churchAttendance.findUnique({
                where: { id: testAttendance.id }
            });
            
            if (!deletedAttendance) {
                console.log('✅ Asistencia fue eliminada permanentemente de la BD');
            } else {
                console.log('❌ Asistencia todavía existe en la BD');
            }
        } else {
            console.log('❌ Falló eliminar asistencia');
            // Limpiar manualmente si falló
            await prisma.churchAttendance.delete({ where: { id: testAttendance.id } });
        }
    } catch (error) {
        console.log('❌ Error en test de eliminar asistencia:', error.message);
    }

    console.log('\n=== FIN DE PRUEBAS DE ASISTENCIA ===');
}

// Ejecutar pruebas
testAttendanceModule()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
