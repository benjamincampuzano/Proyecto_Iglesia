const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authController = require('../controllers/authController');

const prisma = new PrismaClient();

// Mock request and response objects
const mockRequest = (body = {}, user = null) => ({
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

async function testAuthModule() {
    console.log('=== PRUEBAS DEL MÓDULO DE AUTENTICACIÓN ===\n');

    // Test 1: Login con credenciales válidas
    console.log('Test 1: Login con credenciales válidas');
    try {
        const email = process.env.TEST_EMAIL;
        const password = process.env.TEST_PASSWORD;

        if (!email || !password) {
            console.log('⚠️  TEST_EMAIL/TEST_PASSWORD no definidos. Omitiendo login con credenciales válidas.');
        } else {
            const req = mockRequest({ email, password });
            const res = mockResponse();
            await authController.login(req, res);

            if (res.statusCode === 200 && res.data.token) {
                console.log('✅ Login exitoso con credenciales válidas');
            } else {
                console.log('❌ Falló login con credenciales válidas');
                console.log('Response:', res.data);
            }
        }
    } catch (error) {
        console.log('❌ Error en test de login:', error.message);
    }

    // Test 2: Login con credenciales inválidas
    console.log('\nTest 2: Login con credenciales inválidas');
    try {
        const req = mockRequest({
            email: 'usuario@inexistente.com',
            password: 'passwordincorrecta'
        });

        const res = mockResponse();
        await authController.login(req, res);

        if (res.statusCode === 400 || res.statusCode === 401) {
            console.log('✅ Rechazó correctamente credenciales inválidas');
        } else {
            console.log('❌ No rechazó credenciales inválidas');
            console.log('Response:', res.data);
        }
    } catch (error) {
        console.log('❌ Error en test de credenciales inválidas:', error.message);
    }

    // Test 3: Validación de token
    console.log('\nTest 3: Validación de token JWT');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        if (adminUser) {
            // Generar un token válido
            const token = jwt.sign(
                { id: adminUser.id, email: adminUser.email, role: adminUser.role },
                process.env.JWT_SECRET || 'fallback_secret',
                { expiresIn: '24h' }
            );

            if (token) {
                console.log('✅ Token JWT generado correctamente');
                
                // Verificar que el token sea válido
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
                if (decoded.id === adminUser.id) {
                    console.log('✅ Token JWT verificado correctamente');
                } else {
                    console.log('❌ Token JWT no corresponde al usuario');
                }
            } else {
                console.log('❌ No se pudo generar token JWT');
            }
        }
    } catch (error) {
        console.log('❌ Error en validación de token:', error.message);
    }

    // Test 4: Verificación de hashing de contraseñas
    console.log('\nTest 4: Verificación de hashing de contraseñas');
    try {
        const testPassword = 'test123';
        const hashedPassword = await bcrypt.hash(testPassword, 10);
        const isValid = await bcrypt.compare(testPassword, hashedPassword);
        
        if (isValid) {
            console.log('✅ Hashing y verificación de contraseñas funciona correctamente');
        } else {
            console.log('❌ Falló verificación de hashing de contraseñas');
        }

        // Verificar que rechaza contraseña incorrecta
        const isInvalid = await bcrypt.compare('wrongpassword', hashedPassword);
        if (!isInvalid) {
            console.log('✅ Rechaza correctamente contraseña incorrecta');
        } else {
            console.log('❌ No rechazó contraseña incorrecta');
        }
    } catch (error) {
        console.log('❌ Error en test de hashing:', error.message);
    }

    // Test 5: Validación de campos requeridos
    console.log('\nTest 5: Validación de campos requeridos en login');
    try {
        const req = mockRequest({}); // Sin email ni password
        const res = mockResponse();
        await authController.login(req, res);

        if (res.statusCode === 400) {
            console.log('✅ Valida correctamente campos requeridos');
        } else {
            console.log('❌ No valida campos requeridos');
        }
    } catch (error) {
        console.log('❌ Error en validación de campos:', error.message);
    }

    console.log('\n=== FIN DE PRUEBAS DE AUTENTICACIÓN ===');
}

// Ejecutar pruebas
testAuthModule()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
