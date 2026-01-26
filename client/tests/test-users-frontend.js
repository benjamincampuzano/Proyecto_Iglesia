/**
 * Pruebas de Frontend para el Módulo de Usuarios
 * Estas pruebas verifican la funcionalidad de gestión de usuarios
 * en la interfaz de usuario
 */

// Mock de fetch para simular llamadas a la API
global.fetch = jest.fn();

// Importar las funciones del módulo de usuarios
// Nota: Ajusta las rutas de importación según tu estructura real
import { 
    getUsers, 
    createUser, 
    updateUser, 
    deleteUser,
    assignLeader,
    getUserProfile 
} from '../src/services/userService';

describe('Módulo de Usuarios - Frontend', () => {
    beforeEach(() => {
        fetch.mockClear();
        localStorage.clear();
    });

    describe('Obtención de Usuarios', () => {
        test('debería obtener lista de usuarios exitosamente', async () => {
            const mockUsers = [
                { id: 1, fullName: 'Usuario 1', email: 'user1@example.com', role: 'DISCIPULO' },
                { id: 2, fullName: 'Usuario 2', email: 'user2@example.com', role: 'LIDER_CELULA' }
            ];

            const mockResponse = {
                ok: true,
                json: async () => ({ users: mockUsers })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await getUsers();

            expect(fetch).toHaveBeenCalledWith('/api/users', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                }
            });

            expect(result.success).toBe(true);
            expect(result.users).toHaveLength(2);
            expect(result.users[0].fullName).toBe('Usuario 1');
        });

        test('debería manejar error de autenticación', async () => {
            const mockResponse = {
                ok: false,
                status: 401,
                json: async () => ({ message: 'No autorizado' })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await getUsers();

            expect(result.success).toBe(false);
            expect(result.error).toBe('No autorizado');
        });

        test('debería filtrar usuarios por rol', async () => {
            const mockUsers = [
                { id: 1, fullName: 'Líder', email: 'lider@example.com', role: 'LIDER_CELULA' }
            ];

            const mockResponse = {
                ok: true,
                json: async () => ({ users: mockUsers })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await getUsers({ role: 'LIDER_CELULA' });

            expect(fetch).toHaveBeenCalledWith('/api/users?role=LIDER_CELULA', expect.any(Object));
            expect(result.users).toHaveLength(1);
            expect(result.users[0].role).toBe('LIDER_CELULA');
        });
    });

    describe('Creación de Usuarios', () => {
        test('debería crear usuario exitosamente', async () => {
            const newUser = {
                fullName: 'Nuevo Usuario',
                email: 'nuevo@example.com',
                password: 'password123',
                role: 'DISCIPULO'
            };

            const mockResponse = {
                ok: true,
                status: 201,
                json: async () => ({ 
                    user: { ...newUser, id: 3 }
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await createUser(newUser);

            expect(fetch).toHaveBeenCalledWith('/api/users', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newUser)
            });

            expect(result.success).toBe(true);
            expect(result.user.fullName).toBe('Nuevo Usuario');
        });

        test('debería validar campos requeridos', async () => {
            const invalidUser = {
                fullName: '',
                email: '',
                password: ''
            };

            const result = await createUser(invalidUser);

            expect(result.success).toBe(false);
            expect(result.error).toContain('requerido');
        });

        test('debería validar formato de email', async () => {
            const userWithInvalidEmail = {
                fullName: 'Usuario Test',
                email: 'email-invalido',
                password: 'password123',
                role: 'DISCIPULO'
            };

            const result = await createUser(userWithInvalidEmail);

            expect(result.success).toBe(false);
            expect(result.error).toContain('email válido');
        });

        test('debería manejar email duplicado', async () => {
            const mockResponse = {
                ok: false,
                status: 400,
                json: async () => ({ message: 'Email ya existe' })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const existingUser = {
                fullName: 'Usuario Existente',
                email: 'existente@example.com',
                password: 'password123',
                role: 'DISCIPULO'
            };

            const result = await createUser(existingUser);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Email ya existe');
        });
    });

    describe('Actualización de Usuarios', () => {
        test('debería actualizar usuario exitosamente', async () => {
            const updatedUser = {
                fullName: 'Usuario Actualizado',
                email: 'actualizado@example.com',
                role: 'LIDER_CELULA'
            };

            const mockResponse = {
                ok: true,
                json: async () => ({ 
                    user: { ...updatedUser, id: 1 }
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await updateUser(1, updatedUser);

            expect(fetch).toHaveBeenCalledWith('/api/users/1', {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedUser)
            });

            expect(result.success).toBe(true);
            expect(result.user.fullName).toBe('Usuario Actualizado');
        });

        test('debería manejar usuario no encontrado', async () => {
            const mockResponse = {
                ok: false,
                status: 404,
                json: async () => ({ message: 'Usuario no encontrado' })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await updateUser(999, { fullName: 'Test' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Usuario no encontrado');
        });
    });

    describe('Eliminación de Usuarios', () => {
        test('debería eliminar usuario exitosamente', async () => {
            const mockResponse = {
                ok: true,
                json: async () => ({ message: 'Usuario eliminado exitosamente' })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await deleteUser(1);

            expect(fetch).toHaveBeenCalledWith('/api/users/1', {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                }
            });

            expect(result.success).toBe(true);
        });

        test('debería prevenir eliminación de usuario con datos relacionados', async () => {
            const mockResponse = {
                ok: false,
                status: 400,
                json: async () => ({ 
                    message: 'No se puede eliminar: El usuario tiene invitados registrados' 
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await deleteUser(1);

            expect(result.success).toBe(false);
            expect(result.error).toContain('invitados registrados');
        });
    });

    describe('Asignación de Líder', () => {
        test('debería asignar líder exitosamente', async () => {
            const assignmentData = {
                userId: 2,
                leaderId: 1
            };

            const mockResponse = {
                ok: true,
                json: async () => ({ 
                    message: 'Líder asignado exitosamente',
                    user: { id: 2, leaderId: 1 }
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await assignLeader(assignmentData);

            expect(fetch).toHaveBeenCalledWith('/api/network/assign', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(assignmentData)
            });

            expect(result.success).toBe(true);
        });

        test('debería validar restricciones de asignación', async () => {
            const invalidAssignment = {
                userId: 1, // ADMIN
                leaderId: 2  // LIDER_CELULA
            };

            const mockResponse = {
                ok: false,
                status: 400,
                json: async () => ({ 
                    message: 'No se puede asignar líder a ADMIN' 
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await assignLeader(invalidAssignment);

            expect(result.success).toBe(false);
            expect(result.error).toContain('ADMIN');
        });
    });

    describe('Obtención de Perfil', () => {
        test('debería obtener perfil de usuario actual', async () => {
            const mockProfile = {
                id: 1,
                fullName: 'Usuario Test',
                email: 'test@example.com',
                role: 'DISCIPULO',
                phone: '555-1234',
                address: 'Dirección de prueba'
            };

            const mockResponse = {
                ok: true,
                json: async () => ({ user: mockProfile })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await getUserProfile();

            expect(fetch).toHaveBeenCalledWith('/api/users/profile', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                }
            });

            expect(result.success).toBe(true);
            expect(result.user.fullName).toBe('Usuario Test');
        });
    });

    describe('Validaciones de Formularios', () => {
        test('debería validar longitud mínima de nombre', () => {
            const userWithShortName = {
                fullName: 'AB',
                email: 'test@example.com',
                password: 'password123',
                role: 'DISCIPULO'
            };

            const result = createUser(userWithShortName);

            expect(result.success).toBe(false);
            expect(result.error).toContain('al menos 3 caracteres');
        });

        test('debería validar contraseña segura', () => {
            const userWithWeakPassword = {
                fullName: 'Usuario Test',
                email: 'test@example.com',
                password: '123',
                role: 'DISCIPULO'
            };

            const result = createUser(userWithWeakPassword);

            expect(result.success).toBe(false);
            expect(result.error).toContain('contraseña segura');
        });

        test('debería validar rol permitido', () => {
            const userWithInvalidRole = {
                fullName: 'Usuario Test',
                email: 'test@example.com',
                password: 'password123',
                role: 'ROL_INVALIDO'
            };

            const result = createUser(userWithInvalidRole);

            expect(result.success).toBe(false);
            expect(result.error).toContain('rol válido');
        });
    });
});

// Pruebas de Integración con UI
describe('Integración con UI - Gestión de Usuarios', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('debería mostrar lista de usuarios en tabla', async () => {
        document.body.innerHTML = `
            <div id="usersTable">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="usersTableBody">
                        <!-- Las filas se insertarán aquí -->
                    </tbody>
                </table>
            </div>
        `;

        const mockUsers = [
            { id: 1, fullName: 'Usuario 1', email: 'user1@example.com', role: 'DISCIPULO' },
            { id: 2, fullName: 'Usuario 2', email: 'user2@example.com', role: 'LIDER_CELULA' }
        ];

        const mockResponse = {
            ok: true,
            json: async () => ({ users: mockUsers })
        };
        
        fetch.mockResolvedValue(mockResponse);

        // Simular carga de usuarios
        const result = await getUsers();
        
        if (result.success) {
            const tbody = document.getElementById('usersTableBody');
            const rows = tbody.getElementsByTagName('tr');
            
            expect(rows.length).toBe(2);
            expect(rows[0].textContent).toContain('Usuario 1');
            expect(rows[1].textContent).toContain('Usuario 2');
        }
    });

    test('debería mostrar formulario de creación de usuario', () => {
        document.body.innerHTML = `
            <div id="createUserForm">
                <form>
                    <input type="text" id="fullName" placeholder="Nombre completo" />
                    <input type="email" id="email" placeholder="Email" />
                    <input type="password" id="password" placeholder="Contraseña" />
                    <select id="role">
                        <option value="">Seleccionar rol</option>
                        <option value="DISCIPULO">DISCIPULO</option>
                        <option value="LIDER_CELULA">Líder de Célula</option>
                        <option value="LIDER_DOCE">Líder de Doce</option>
                    </select>
                    <button type="submit">Crear Usuario</button>
                    <div id="formErrors" style="color: red;"></div>
                </form>
            </div>
        `;

        const form = document.getElementById('createUserForm');
        const fullNameInput = document.getElementById('fullName');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const roleSelect = document.getElementById('role');
        const errorDiv = document.getElementById('formErrors');

        // Simular envío con datos inválidos
        fullNameInput.value = '';
        emailInput.value = 'email-invalido';
        passwordInput.value = '123';
        roleSelect.value = '';

        form.dispatchEvent(new Event('submit'));

        // Verificar mensajes de error
        expect(errorDiv.textContent).toContain('Nombre es requerido');
        expect(errorDiv.textContent).toContain('Email válido');
        expect(errorDiv.textContent).toContain('Contraseña segura');
        expect(errorDiv.textContent).toContain('Rol es requerido');
    });

    test('debería mostrar confirmación antes de eliminar usuario', () => {
        document.body.innerHTML = `
            <div id="usersTable">
                <table>
                    <tbody>
                        <tr data-user-id="1">
                            <td>Usuario Test</td>
                            <td>
                                <button class="delete-user" data-user-id="1">Eliminar</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div id="confirmDialog" style="display: none;">
                <p>¿Está seguro de eliminar este usuario?</p>
                <button id="confirmDelete">Sí</button>
                <button id="cancelDelete">No</button>
            </div>
        `;

        const deleteButton = document.querySelector('.delete-user');
        const confirmDialog = document.getElementById('confirmDialog');

        // Simular clic en eliminar
        deleteButton.click();

        // Verificar que se muestre diálogo de confirmación
        expect(confirmDialog.style.display).toBe('block');
    });

    test('debería manejar paginación de usuarios', async () => {
        document.body.innerHTML = `
            <div id="usersContainer">
                <div id="usersList"></div>
                <div id="pagination">
                    <button id="prevPage" disabled>Anterior</button>
                    <span id="pageInfo">Página 1 de 1</span>
                    <button id="nextPage">Siguiente</button>
                </div>
            </div>
        `;

        // Mock de respuesta con paginación
        const mockPaginatedResponse = {
            ok: true,
            json: async () => ({
                users: [
                    { id: 1, fullName: 'Usuario 1', email: 'user1@example.com', role: 'DISCIPULO' }
                ],
                pagination: {
                    currentPage: 1,
                    totalPages: 3,
                    total: 25
                }
            })
        };
        
        fetch.mockResolvedValue(mockPaginatedResponse);

        const result = await getUsers({ page: 1 });
        
        if (result.success) {
            const pageInfo = document.getElementById('pageInfo');
            const nextButton = document.getElementById('nextPage');
            const prevButton = document.getElementById('prevPage');

            expect(pageInfo.textContent).toBe('Página 1 de 3');
            expect(prevButton.disabled).toBe(true);
            expect(nextButton.disabled).toBe(false);
        }
    });
});

console.log('✅ Pruebas de Frontend para Usuarios creadas exitosamente');
console.log('📋 Para ejecutar las pruebas:');
console.log('   npm test -- test-users-frontend.js');
console.log('   o');
console.log('   npx jest test-users-frontend.js');
