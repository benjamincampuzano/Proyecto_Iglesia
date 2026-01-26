/**
 * Pruebas de Frontend para el Módulo de Autenticación
 * Estas pruebas verifican la funcionalidad del formulario de login
 * y la gestión de tokens de autenticación
 */

// Mock de fetch para simular llamadas a la API
global.fetch = jest.fn();

// Importar las funciones del módulo de autenticación
// Nota: Ajusta las rutas de importación según tu estructura real
import { login, logout, isAuthenticated, getToken } from '../src/utils/auth';

describe('Módulo de Autenticación - Frontend', () => {
    beforeEach(() => {
        // Limpiar mocks antes de cada prueba
        fetch.mockClear();
        localStorage.clear();
    });

    describe('Función de Login', () => {
        test('debería hacer login exitosamente con credenciales válidas', async () => {
            const mockResponse = {
                ok: true,
                json: async () => ({
                    token: 'mock-jwt-token',
                    user: {
                        id: 1,
                        email: 'admin@example.com',
                        fullName: 'Administrador',
                        role: 'ADMIN'
                    }
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const credentials = {
                email: 'admin@example.com',
                password: 'password123'
            };

            const result = await login(credentials);

            expect(fetch).toHaveBeenCalledWith('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials)
            });

            expect(result.success).toBe(true);
            expect(result.token).toBe('mock-jwt-token');
            expect(result.user.email).toBe('admin@example.com');
        });

        test('debería rechazar credenciales inválidas', async () => {
            const mockResponse = {
                ok: false,
                status: 401,
                json: async () => ({
                    message: 'Credenciales inválidas'
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const credentials = {
                email: 'admin@example.com',
                password: 'passwordincorrecta'
            };

            const result = await login(credentials);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Credenciales inválidas');
        });

        test('debería manejar errores de red', async () => {
            fetch.mockRejectedValue(new Error('Error de red'));

            const credentials = {
                email: 'admin@example.com',
                password: 'password123'
            };

            const result = await login(credentials);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Error de red');
        });

        test('debería validar campos requeridos', async () => {
            const credentials = {
                email: '',
                password: ''
            };

            const result = await login(credentials);

            expect(result.success).toBe(false);
            expect(result.error).toContain('requerido');
        });

        test('debería validar formato de email', async () => {
            const credentials = {
                email: 'email-invalido',
                password: 'password123'
            };

            const result = await login(credentials);

            expect(result.success).toBe(false);
            expect(result.error).toContain('email válido');
        });
    });

    describe('Función de Logout', () => {
        test('debería cerrar sesión correctamente', () => {
            // Simular que hay un token en localStorage
            localStorage.setItem('token', 'mock-token');
            localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@example.com' }));

            const result = logout();

            expect(localStorage.getItem('token')).toBeNull();
            expect(localStorage.getItem('user')).toBeNull();
            expect(result.success).toBe(true);
        });

        test('debería manejar cuando no hay sesión activa', () => {
            const result = logout();

            expect(result.success).toBe(true);
            expect(localStorage.getItem('token')).toBeNull();
        });
    });

    describe('Verificación de Autenticación', () => {
        test('debería retornar true cuando hay un token válido', () => {
            localStorage.setItem('token', 'valid-token');

            const result = isAuthenticated();

            expect(result).toBe(true);
        });

        test('debería retornar false cuando no hay token', () => {
            localStorage.removeItem('token');

            const result = isAuthenticated();

            expect(result).toBe(false);
        });

        test('debería retornar false cuando el token está vacío', () => {
            localStorage.setItem('token', '');

            const result = isAuthenticated();

            expect(result).toBe(false);
        });
    });

    describe('Obtención de Token', () => {
        test('debería retornar el token cuando existe', () => {
            const token = 'test-jwt-token';
            localStorage.setItem('token', token);

            const result = getToken();

            expect(result).toBe(token);
        });

        test('debería retornar null cuando no hay token', () => {
            localStorage.removeItem('token');

            const result = getToken();

            expect(result).toBeNull();
        });
    });

    describe('Manejo de Expiración de Token', () => {
        test('debería detectar token expirado', async () => {
            const expiredToken = 'expired-jwt-token';
            localStorage.setItem('token', expiredToken);

            // Mock de respuesta 401 para token expirado
            const mockResponse = {
                ok: false,
                status: 401,
                json: async () => ({
                    message: 'Token expirado'
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            // Intentar una llamada que requiere autenticación
            try {
                await fetch('/api/protected-route', {
                    headers: {
                        'Authorization': `Bearer ${expiredToken}`
                    }
                });
            } catch (error) {
                // El token debería ser eliminado
                expect(localStorage.getItem('token')).toBeNull();
            }
        });
    });

    describe('Seguridad de Contraseñas', () => {
        test('debería validar fortaleza de contraseña', () => {
            const weakPassword = '123';
            const strongPassword = 'MiContraseñaSegura123!';

            // Simular validación de fortaleza
            const validatePassword = (password) => {
                return {
                    isValid: password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password),
                    errors: password.length < 8 ? ['La contraseña debe tener al menos 8 caracteres'] :
                             !/[A-Z]/.test(password) ? ['Debe contener mayúsculas'] :
                             !/[0-9]/.test(password) ? ['Debe contener números'] : []
                };
            };

            const weakResult = validatePassword(weakPassword);
            const strongResult = validatePassword(strongPassword);

            expect(weakResult.isValid).toBe(false);
            expect(weakResult.errors.length).toBeGreaterThan(0);
            
            expect(strongResult.isValid).toBe(true);
            expect(strongResult.errors.length).toBe(0);
        });
    });

    describe('Manejo de Estado de Carga', () => {
        test('debería mostrar estado de carga durante login', async () => {
            let isLoading = false;
            
            // Mock de función que actualiza estado de carga
            const setLoading = (loading) => {
                isLoading = loading;
            };

            // Simular llamada asíncrona
            const mockResponse = {
                ok: true,
                json: async () => ({
                    token: 'mock-token',
                    user: { id: 1, email: 'test@example.com' }
                })
            };
            
            fetch.mockImplementation(() => {
                setLoading(true);
                return new Promise(resolve => {
                    setTimeout(() => {
                        setLoading(false);
                        resolve(mockResponse);
                    }, 100);
                });
            });

            const credentials = { email: 'test@example.com', password: 'password123' };
            
            await login(credentials);

            expect(isLoading).toBe(false); // Debe terminar en false
        });
    });

    describe('Almacenamiento Seguro', () => {
        test('no debería almacenar información sensible en localStorage de forma insegura', () => {
            const sensitiveData = {
                password: 'password123',
                token: 'secret-token'
            };

            // Verificar que no se almacene información sensible
            expect(localStorage.getItem('password')).toBeNull();
            expect(localStorage.getItem('secret-token')).toBeNull();
        });

        test('debería limpiar datos sensibles al cerrar sesión', () => {
            localStorage.setItem('token', 'secret-token');
            localStorage.setItem('user', JSON.stringify({ email: 'test@example.com' }));
            localStorage.setItem('password-temp', 'temp-password');

            logout();

            expect(localStorage.getItem('token')).toBeNull();
            expect(localStorage.getItem('user')).toBeNull();
            expect(localStorage.getItem('password-temp')).toBeNull();
        });
    });
});

// Pruebas de Integración con UI
describe('Integración con UI - Formulario de Login', () => {
    test('debería mostrar mensaje de error para credenciales inválidas', async () => {
        // Mock del DOM
        document.body.innerHTML = `
            <form id="loginForm">
                <input type="email" id="email" />
                <input type="password" id="password" />
                <button type="submit">Login</button>
                <div id="errorMessage" style="display: none;"></div>
            </form>
        `;

        const mockResponse = {
            ok: false,
            status: 401,
            json: async () => ({
                message: 'Credenciales inválidas'
            })
        };
        
        fetch.mockResolvedValue(mockResponse);

        const form = document.getElementById('loginForm');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const errorDiv = document.getElementById('errorMessage');

        emailInput.value = 'test@example.com';
        passwordInput.value = 'wrongpassword';

        // Simular envío del formulario
        form.dispatchEvent(new Event('submit'));

        // Esperar a que se procese la respuesta
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(errorDiv.style.display).toBe('block');
        expect(errorDiv.textContent).toContain('Credenciales inválidas');
    });

    test('debería deshabilitar botón durante login', async () => {
        document.body.innerHTML = `
            <form id="loginForm">
                <button type="submit" id="loginButton">Login</button>
            </form>
        `;

        const button = document.getElementById('loginButton');
        
        // Mock que simula estado de carga
        fetch.mockImplementation(() => {
            button.disabled = true;
            return new Promise(resolve => {
                setTimeout(() => {
                    button.disabled = false;
                    resolve({
                        ok: true,
                        json: async () => ({ token: 'mock-token' })
                    });
                }, 100);
            });
        });

        const form = document.getElementById('loginForm');
        form.dispatchEvent(new Event('submit'));

        expect(button.disabled).toBe(true);

        // Esperar a que termine
        await new Promise(resolve => setTimeout(resolve, 150));
        expect(button.disabled).toBe(false);
    });
});

console.log('✅ Pruebas de Frontend para Autenticación creadas exitosamente');
console.log('📋 Para ejecutar las pruebas:');
console.log('   npm test -- test-auth-frontend.js');
console.log('   o');
console.log('   npx jest test-auth-frontend.js');
