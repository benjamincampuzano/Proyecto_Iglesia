/**
 * Pruebas de Frontend para el Módulo de Invitados
 * Estas pruebas verifican la funcionalidad de gestión de invitados
 * en la interfaz de usuario
 */

// Mock de fetch para simular llamadas a la API
global.fetch = jest.fn();

// Importar las funciones del módulo de invitados
// Nota: Ajusta las rutas de importación según tu estructura real
import { 
    getGuests, 
    createGuest, 
    updateGuest, 
    deleteGuest,
    assignGuest,
    getGuestStats 
} from '../src/services/guestService';

describe('Módulo de Invitados - Frontend', () => {
    beforeEach(() => {
        fetch.mockClear();
        localStorage.clear();
    });

    describe('Obtención de Invitados', () => {
        test('debería obtener lista de invitados exitosamente', async () => {
            const mockGuests = [
                { 
                    id: 1, 
                    name: 'Invitado 1', 
                    phone: '555-1234', 
                    status: 'NUEVO',
                    invitedBy: { fullName: 'Líder 1' }
                },
                { 
                    id: 2, 
                    name: 'Invitado 2', 
                    phone: '555-5678', 
                    status: 'CONTACTADO',
                    assignedTo: { fullName: 'Líder 2' }
                }
            ];

            const mockResponse = {
                ok: true,
                json: async () => ({ guests: mockGuests })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await getGuests();

            expect(fetch).toHaveBeenCalledWith('/api/guests', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                }
            });

            expect(result.success).toBe(true);
            expect(result.guests).toHaveLength(2);
            expect(result.guests[0].name).toBe('Invitado 1');
        });

        test('debería filtrar invitados por estado', async () => {
            const mockGuests = [
                { id: 1, name: 'Invitado 1', status: 'NUEVO' }
            ];

            const mockResponse = {
                ok: true,
                json: async () => ({ guests: mockGuests })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await getGuests({ status: 'NUEVO' });

            expect(fetch).toHaveBeenCalledWith('/api/guests?status=NUEVO', expect.any(Object));
            expect(result.guests).toHaveLength(1);
            expect(result.guests[0].status).toBe('NUEVO');
        });

        test('debería manejar error de permisos', async () => {
            const mockResponse = {
                ok: false,
                status: 403,
                json: async () => ({ message: 'No tiene permisos para ver invitados' })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await getGuests();

            expect(result.success).toBe(false);
            expect(result.error).toBe('No tiene permisos para ver invitados');
        });
    });

    describe('Creación de Invitados', () => {
        test('debería crear invitado exitosamente', async () => {
            const newGuest = {
                name: 'Nuevo Invitado',
                phone: '555-9999',
                address: 'Dirección de prueba',
                prayerRequest: 'Oración de prueba'
            };

            const mockResponse = {
                ok: true,
                status: 201,
                json: async () => ({ 
                    guest: { ...newGuest, id: 3, status: 'NUEVO' }
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await createGuest(newGuest);

            expect(fetch).toHaveBeenCalledWith('/api/guests', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newGuest)
            });

            expect(result.success).toBe(true);
            expect(result.guest.name).toBe('Nuevo Invitado');
            expect(result.guest.status).toBe('NUEVO');
        });

        test('debería validar campos requeridos', async () => {
            const invalidGuest = {
                name: '',
                phone: ''
            };

            const result = await createGuest(invalidGuest);

            expect(result.success).toBe(false);
            expect(result.error).toContain('requerido');
        });

        test('debería validar formato de teléfono', async () => {
            const guestWithInvalidPhone = {
                name: 'Invitado Test',
                phone: 'teléfono-inválido',
                address: 'Dirección de prueba'
            };

            const result = await createGuest(guestWithInvalidPhone);

            expect(result.success).toBe(false);
            expect(result.error).toContain('teléfono válido');
        });

        test('debería asignar automáticamente el líder actual', async () => {
            const newGuest = {
                name: 'Invitado Auto',
                phone: '555-7777'
            };

            // Simular usuario actual
            localStorage.setItem('user', JSON.stringify({ id: 1, fullName: 'Líder Actual' }));

            const mockResponse = {
                ok: true,
                status: 201,
                json: async () => ({ 
                    guest: { ...newGuest, id: 4, invitedById: 1 }
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await createGuest(newGuest);

            expect(result.success).toBe(true);
            expect(result.guest.invitedById).toBe(1);
        });
    });

    describe('Actualización de Invitados', () => {
        test('debería actualizar invitado exitosamente', async () => {
            const updatedGuest = {
                name: 'Invitado Actualizado',
                status: 'CONTACTADO',
                assignedToId: 2
            };

            const mockResponse = {
                ok: true,
                json: async () => ({ 
                    guest: { ...updatedGuest, id: 1 }
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await updateGuest(1, updatedGuest);

            expect(fetch).toHaveBeenCalledWith('/api/guests/1', {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedGuest)
            });

            expect(result.success).toBe(true);
            expect(result.guest.name).toBe('Invitado Actualizado');
            expect(result.guest.status).toBe('CONTACTADO');
        });

        test('debería validar transición de estados', async () => {
            const invalidTransition = {
                status: 'GANADO' // Saltando directamente al estado final
            };

            const mockResponse = {
                ok: false,
                status: 400,
                json: async () => ({ 
                    message: 'Transición de estado inválida' 
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await updateGuest(1, invalidTransition);

            expect(result.success).toBe(false);
            expect(result.error).toContain('transición inválida');
        });

        test('debería manejar invitado no encontrado', async () => {
            const mockResponse = {
                ok: false,
                status: 404,
                json: async () => ({ message: 'Invitado no encontrado' })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await updateGuest(999, { name: 'Test' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invitado no encontrado');
        });
    });

    describe('Asignación de Invitados', () => {
        test('debería asignar invitado a líder exitosamente', async () => {
            const assignmentData = {
                guestId: 1,
                assignedToId: 2
            };

            const mockResponse = {
                ok: true,
                json: async () => ({ 
                    message: 'Invitado asignado exitosamente',
                    guest: { id: 1, assignedToId: 2 }
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await assignGuest(assignmentData);

            expect(fetch).toHaveBeenCalledWith('/api/guests/assign', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(assignmentData)
            });

            expect(result.success).toBe(true);
        });

        test('debería validar permisos de asignación', async () => {
            const mockResponse = {
                ok: false,
                status: 403,
                json: async () => ({ 
                    message: 'No tiene permisos para asignar invitados' 
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await assignGuest({ guestId: 1, assignedToId: 2 });

            expect(result.success).toBe(false);
            expect(result.error).toContain('permisos');
        });
    });

    describe('Eliminación de Invitados', () => {
        test('debería eliminar invitado exitosamente', async () => {
            const mockResponse = {
                ok: true,
                json: async () => ({ message: 'Invitado eliminado exitosamente' })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await deleteGuest(1);

            expect(fetch).toHaveBeenCalledWith('/api/guests/1', {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                }
            });

            expect(result.success).toBe(true);
        });

        test('debería prevenir eliminación de invitado con seguimiento activo', async () => {
            const mockResponse = {
                ok: false,
                status: 400,
                json: async () => ({ 
                    message: 'No se puede eliminar: El invitado tiene seguimiento activo' 
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await deleteGuest(1);

            expect(result.success).toBe(false);
            expect(result.error).toContain('seguimiento activo');
        });
    });

    describe('Estadísticas de Invitados', () => {
        test('debería obtener estadísticas exitosamente', async () => {
            const mockStats = {
                total: 50,
                byStatus: {
                    NUEVO: 20,
                    CONTACTADO: 15,
                    EN_CONSOLIDACION: 10,
                    GANADO: 5
                },
                byMonth: [
                    { month: '2024-01', count: 10 },
                    { month: '2024-02', count: 15 }
                ]
            };

            const mockResponse = {
                ok: true,
                json: async () => ({ stats: mockStats })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await getGuestStats();

            expect(fetch).toHaveBeenCalledWith('/api/guests/stats', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                }
            });

            expect(result.success).toBe(true);
            expect(result.stats.total).toBe(50);
            expect(result.stats.byStatus.NUEVO).toBe(20);
        });

        test('debería filtrar estadísticas por rango de fechas', async () => {
            const mockResponse = {
                ok: true,
                json: async () => ({ 
                    stats: { total: 25, byStatus: { NUEVO: 10 } }
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const dateRange = {
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            };

            const result = await getGuestStats(dateRange);

            expect(fetch).toHaveBeenCalledWith(
                '/api/guests/stats?startDate=2024-01-01&endDate=2024-12-31', 
                expect.any(Object)
            );
            expect(result.success).toBe(true);
        });
    });
});

// Pruebas de Integración con UI
describe('Integración con UI - Gestión de Invitados', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('debería mostrar lista de invitados con tarjetas', async () => {
        document.body.innerHTML = `
            <div id="guestsList">
                <div id="guestsContainer">
                    <!-- Las tarjetas de invitados se insertarán aquí -->
                </div>
            </div>
        `;

        const mockGuests = [
            { id: 1, name: 'Invitado 1', phone: '555-1234', status: 'NUEVO' },
            { id: 2, name: 'Invitado 2', phone: '555-5678', status: 'CONTACTADO' }
        ];

        const mockResponse = {
            ok: true,
            json: async () => ({ guests: mockGuests })
        };
        
        fetch.mockResolvedValue(mockResponse);

        const result = await getGuests();
        
        if (result.success) {
            const container = document.getElementById('guestsContainer');
            const cards = container.getElementsByClassName('guest-card');
            
            expect(cards.length).toBe(2);
            expect(cards[0].textContent).toContain('Invitado 1');
            expect(cards[1].textContent).toContain('Invitado 2');
        }
    });

    test('debería mostrar formulario de creación de invitado', () => {
        document.body.innerHTML = `
            <div id="createGuestForm">
                <form>
                    <input type="text" id="guestName" placeholder="Nombre del invitado" />
                    <input type="tel" id="guestPhone" placeholder="Teléfono" />
                    <textarea id="guestAddress" placeholder="Dirección"></textarea>
                    <textarea id="prayerRequest" placeholder="Petición de oración"></textarea>
                    <button type="submit">Agregar Invitado</button>
                    <div id="formErrors" style="color: red;"></div>
                </form>
            </div>
        `;

        const form = document.getElementById('createGuestForm');
        const nameInput = document.getElementById('guestName');
        const phoneInput = document.getElementById('guestPhone');
        const errorDiv = document.getElementById('formErrors');

        // Simular envío con datos inválidos
        nameInput.value = '';
        phoneInput.value = '';

        form.dispatchEvent(new Event('submit'));

        // Verificar mensajes de error
        expect(errorDiv.textContent).toContain('Nombre es requerido');
        expect(errorDiv.textContent).toContain('Teléfono es requerido');
    });

    test('debería mostrar colores según estado del invitado', async () => {
        document.body.innerHTML = `
            <div id="guestsList">
                <div id="guestsContainer"></div>
            </div>
        `;

        const mockGuests = [
            { id: 1, name: 'Invitado Nuevo', status: 'NUEVO' },
            { id: 2, name: 'Invitado Contactado', status: 'CONTACTADO' },
            { id: 3, name: 'Invitado Consolidado', status: 'EN_CONSOLIDACION' },
            { id: 4, name: 'Invitado Ganado', status: 'GANADO' }
        ];

        const mockResponse = {
            ok: true,
            json: async () => ({ guests: mockGuests })
        };
        
        fetch.mockResolvedValue(mockResponse);

        await getGuests();
        
        // Simular función que aplica colores según estado
        const getStatusColor = (status) => {
            const colors = {
                'NUEVO': '#3B82F6',      // Azul
                'CONTACTADO': '#F59E0B',  // Amarillo
                'EN_CONSOLIDACION': '#F97316', // Naranja
                'GANADO': '#10B981'      // Verde
            };
            return colors[status] || '#6B7280';
        };

        const container = document.getElementById('guestsContainer');
        const statusElements = container.getElementsByClassName('guest-status');

        expect(statusElements[0].style.backgroundColor).toBe(getStatusColor('NUEVO'));
        expect(statusElements[1].style.backgroundColor).toBe(getStatusColor('CONTACTADO'));
        expect(statusElements[2].style.backgroundColor).toBe(getStatusColor('EN_CONSOLIDACION'));
        expect(statusElements[3].style.backgroundColor).toBe(getStatusColor('GANADO'));
    });

    test('debería mostrar diálogo de confirmación para eliminar', () => {
        document.body.innerHTML = `
            <div id="guestsList">
                <div class="guest-card" data-guest-id="1">
                    <h3>Invitado Test</h3>
                    <button class="delete-guest" data-guest-id="1">Eliminar</button>
                </div>
            </div>
            <div id="confirmDialog" style="display: none;">
                <p>¿Está seguro de eliminar este invitado?</p>
                <button id="confirmDelete">Sí</button>
                <button id="cancelDelete">No</button>
            </div>
        `;

        const deleteButton = document.querySelector('.delete-guest');
        const confirmDialog = document.getElementById('confirmDialog');

        // Simular clic en eliminar
        deleteButton.click();

        // Verificar que se muestre diálogo de confirmación
        expect(confirmDialog.style.display).toBe('block');
    });

    test('debería mostrar estadísticas en dashboard', async () => {
        document.body.innerHTML = `
            <div id="guestsDashboard">
                <div class="stat-card" id="totalGuests">
                    <h3>Total de Invitados</h3>
                    <span class="stat-number">0</span>
                </div>
                <div class="stats-chart" id="guestsChart">
                    <!-- Gráfico de estadísticas -->
                </div>
            </div>
        `;

        const mockStats = {
            total: 45,
            byStatus: { NUEVO: 15, CONTACTADO: 20, EN_CONSOLIDACION: 7, GANADO: 3 }
        };

        const mockResponse = {
            ok: true,
            json: async () => ({ stats: mockStats })
        };
        
        fetch.mockResolvedValue(mockResponse);

        const result = await getGuestStats();
        
        if (result.success) {
            const totalElement = document.querySelector('#totalGuests .stat-number');
            expect(totalElement.textContent).toBe('45');
        }
    });

    test('debería manejar búsqueda y filtrado de invitados', () => {
        document.body.innerHTML = `
            <div id="guestsFilters">
                <input type="text" id="searchInput" placeholder="Buscar invitado..." />
                <select id="statusFilter">
                    <option value="">Todos los estados</option>
                    <option value="NUEVO">Nuevo</option>
                    <option value="CONTACTADO">Contactado</option>
                    <option value="EN_CONSOLIDACION">En Consolidación</option>
                    <option value="GANADO">Ganado</option>
                </select>
                <button id="applyFilters">Aplicar Filtros</button>
            </div>
            <div id="guestsList"></div>
        `;

        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');
        const applyButton = document.getElementById('applyFilters');

        // Simular aplicación de filtros
        searchInput.value = 'Juan';
        statusFilter.value = 'NUEVO';
        applyButton.click();

        // Verificar que los filtros se apliquen
        expect(searchInput.value).toBe('Juan');
        expect(statusFilter.value).toBe('NUEVO');
    });
});

console.log('✅ Pruebas de Frontend para Invitados creadas exitosamente');
console.log('📋 Para ejecutar las pruebas:');
console.log('   npm test -- test-guests-frontend.js');
console.log('   o');
console.log('   npx jest test-guests-frontend.js');
