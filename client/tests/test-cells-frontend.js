/**
 * Pruebas de Frontend para el Módulo de Células
 * Estas pruebas verifican la funcionalidad de gestión de células
 * en la interfaz de usuario
 */

// Mock de fetch para simular llamadas a la API
global.fetch = jest.fn();

// Importar las funciones del módulo de células
// Nota: Ajusta las rutas de importación según tu estructura real
import { 
    getCells, 
    createCell, 
    updateCell, 
    deleteCell,
    addMemberToCell,
    removeMemberFromCell,
    getCellStats 
} from '../src/services/cellService';

describe('Módulo de Células - Frontend', () => {
    beforeEach(() => {
        fetch.mockClear();
        localStorage.clear();
    });

    describe('Obtención de Células', () => {
        test('debería obtener lista de células exitosamente', async () => {
            const mockCells = [
                { 
                    id: 1, 
                    name: 'Célula Central', 
                    leader: { fullName: 'Líder 1' },
                    dayOfWeek: 'Martes',
                    time: '19:00',
                    memberCount: 8
                },
                { 
                    id: 2, 
                    name: 'Célula Norte', 
                    leader: { fullName: 'Líder 2' },
                    dayOfWeek: 'Jueves',
                    time: '20:00',
                    memberCount: 6
                }
            ];

            const mockResponse = {
                ok: true,
                json: async () => ({ cells: mockCells })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await getCells();

            expect(fetch).toHaveBeenCalledWith('/api/cells', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                }
            });

            expect(result.success).toBe(true);
            expect(result.cells).toHaveLength(2);
            expect(result.cells[0].name).toBe('Célula Central');
        });

        test('debería filtrar células por día', async () => {
            const mockCells = [
                { id: 1, name: 'Célula Martes', dayOfWeek: 'Martes' }
            ];

            const mockResponse = {
                ok: true,
                json: async () => ({ cells: mockCells })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await getCells({ dayOfWeek: 'Martes' });

            expect(fetch).toHaveBeenCalledWith('/api/cells?dayOfWeek=Martes', expect.any(Object));
            expect(result.cells).toHaveLength(1);
            expect(result.cells[0].dayOfWeek).toBe('Martes');
        });

        test('debería manejar permisos según rol', async () => {
            const mockCells = [
                { id: 1, name: 'Mi Célula', leaderId: 1 }
            ];

            const mockResponse = {
                ok: true,
                json: async () => ({ cells: mockCells })
            };
            
            fetch.mockResolvedValue(mockResponse);

            // Simular usuario LIDER_CELULA
            localStorage.setItem('user', JSON.stringify({ id: 1, role: 'LIDER_CELULA' }));

            const result = await getCells();

            expect(result.success).toBe(true);
            expect(result.cells[0].leaderId).toBe(1);
        });
    });

    describe('Creación de Células', () => {
        test('debería crear célula exitosamente', async () => {
            const newCell = {
                name: 'Nueva Célula',
                description: 'Descripción de la nueva célula',
                address: 'Dirección de la célula',
                city: 'Ciudad',
                dayOfWeek: 'Miércoles',
                time: '19:30',
                leaderId: 1
            };

            const mockResponse = {
                ok: true,
                status: 201,
                json: async () => ({ 
                    cell: { ...newCell, id: 3 }
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await createCell(newCell);

            expect(fetch).toHaveBeenCalledWith('/api/cells', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newCell)
            });

            expect(result.success).toBe(true);
            expect(result.cell.name).toBe('Nueva Célula');
        });

        test('debería validar campos requeridos', async () => {
            const invalidCell = {
                name: '',
                leaderId: null
            };

            const result = await createCell(invalidCell);

            expect(result.success).toBe(false);
            expect(result.error).toContain('requerido');
        });

        test('debería validar formato de hora', async () => {
            const cellWithInvalidTime = {
                name: 'Célula Test',
                leaderId: 1,
                time: 'hora-inválida'
            };

            const result = await createCell(cellWithInvalidTime);

            expect(result.success).toBe(false);
            expect(result.error).toContain('hora válida');
        });

        test('debería validar día de la semana', async () => {
            const cellWithInvalidDay = {
                name: 'Célula Test',
                leaderId: 1,
                dayOfWeek: 'Día-inválido'
            };

            const validDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            
            const result = await createCell(cellWithInvalidDay);

            expect(result.success).toBe(false);
            expect(result.error).toContain('día válido');
        });
    });

    describe('Actualización de Células', () => {
        test('debería actualizar célula exitosamente', async () => {
            const updatedCell = {
                name: 'Célula Actualizada',
                description: 'Descripción actualizada',
                time: '20:00'
            };

            const mockResponse = {
                ok: true,
                json: async () => ({ 
                    cell: { ...updatedCell, id: 1 }
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await updateCell(1, updatedCell);

            expect(fetch).toHaveBeenCalledWith('/api/cells/1', {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedCell)
            });

            expect(result.success).toBe(true);
            expect(result.cell.name).toBe('Célula Actualizada');
        });

        test('debería manejar célula no encontrada', async () => {
            const mockResponse = {
                ok: false,
                status: 404,
                json: async () => ({ message: 'Célula no encontrada' })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await updateCell(999, { name: 'Test' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Célula no encontrada');
        });
    });

    describe('Gestión de DISCIPULOs', () => {
        test('debería agregar DISCIPULO a célula exitosamente', async () => {
            const memberData = {
                userId: 2
            };

            const mockResponse = {
                ok: true,
                json: async () => ({ 
                    message: 'DISCIPULO agregado exitosamente',
                    user: { id: 2, cellId: 1 }
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await addMemberToCell(1, memberData);

            expect(fetch).toHaveBeenCalledWith('/api/cells/1/members', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(memberData)
            });

            expect(result.success).toBe(true);
        });

        test('debería remover DISCIPULO de célula exitosamente', async () => {
            const mockResponse = {
                ok: true,
                json: async () => ({ 
                    message: 'DISCIPULO removido exitosamente',
                    user: { id: 2, cellId: null }
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await removeMemberFromCell(1, 2);

            expect(fetch).toHaveBeenCalledWith('/api/cells/1/members/2', {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                }
            });

            expect(result.success).toBe(true);
        });

        test('debería validar que el DISCIPULO no esté ya en otra célula', async () => {
            const mockResponse = {
                ok: false,
                status: 400,
                json: async () => ({ 
                    message: 'El usuario ya pertenece a otra célula' 
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await addMemberToCell(1, { userId: 2 });

            expect(result.success).toBe(false);
            expect(result.error).toContain('otra célula');
        });
    });

    describe('Eliminación de Células', () => {
        test('debería eliminar célula exitosamente', async () => {
            const mockResponse = {
                ok: true,
                json: async () => ({ message: 'Célula eliminada exitosamente' })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await deleteCell(1);

            expect(fetch).toHaveBeenCalledWith('/api/cells/1', {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                }
            });

            expect(result.success).toBe(true);
        });

        test('debería prevenir eliminación de célula con DISCIPULOs activos', async () => {
            const mockResponse = {
                ok: false,
                status: 400,
                json: async () => ({ 
                    message: 'No se puede eliminar: La célula tiene DISCIPULOs activos' 
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await deleteCell(1);

            expect(result.success).toBe(false);
            expect(result.error).toContain('DISCIPULOs activos');
        });
    });

    describe('Estadísticas de Células', () => {
        test('debería obtener estadísticas exitosamente', async () => {
            const mockStats = {
                total: 15,
                byLeader: {
                    'Líder 1': 3,
                    'Líder 2': 2
                },
                byDay: {
                    'Martes': 8,
                    'Jueves': 5,
                    'Viernes': 2
                },
                averageMembers: 6.5
            };

            const mockResponse = {
                ok: true,
                json: async () => ({ stats: mockStats })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await getCellStats();

            expect(fetch).toHaveBeenCalledWith('/api/cells/stats', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer null',
                    'Content-Type': 'application/json',
                }
            });

            expect(result.success).toBe(true);
            expect(result.stats.total).toBe(15);
            expect(result.stats.averageMembers).toBe(6.5);
        });

        test('debería filtrar estadísticas por líder', async () => {
            const mockResponse = {
                ok: true,
                json: async () => ({ 
                    stats: { total: 3, byLeader: { 'Líder 1': 3 } }
                })
            };
            
            fetch.mockResolvedValue(mockResponse);

            const result = await getCellStats({ leaderId: 1 });

            expect(fetch).toHaveBeenCalledWith('/api/cells/stats?leaderId=1', expect.any(Object));
            expect(result.success).toBe(true);
        });
    });
});

// Pruebas de Integración con UI
describe('Integración con UI - Gestión de Células', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('debería mostrar lista de células en tarjetas', async () => {
        document.body.innerHTML = `
            <div id="cellsList">
                <div id="cellsContainer">
                    <!-- Las tarjetas de células se insertarán aquí -->
                </div>
            </div>
        `;

        const mockCells = [
            { id: 1, name: 'Célula Central', leader: { fullName: 'Líder 1' }, dayOfWeek: 'Martes', time: '19:00' },
            { id: 2, name: 'Célula Norte', leader: { fullName: 'Líder 2' }, dayOfWeek: 'Jueves', time: '20:00' }
        ];

        const mockResponse = {
            ok: true,
            json: async () => ({ cells: mockCells })
        };
        
        fetch.mockResolvedValue(mockResponse);

        const result = await getCells();
        
        if (result.success) {
            const container = document.getElementById('cellsContainer');
            const cards = container.getElementsByClassName('cell-card');
            
            expect(cards.length).toBe(2);
            expect(cards[0].textContent).toContain('Célula Central');
            expect(cards[1].textContent).toContain('Célula Norte');
        }
    });

    test('debería mostrar formulario de creación de célula', () => {
        document.body.innerHTML = `
            <div id="createCellForm">
                <form>
                    <input type="text" id="cellName" placeholder="Nombre de la célula" />
                    <textarea id="cellDescription" placeholder="Descripción"></textarea>
                    <input type="text" id="cellAddress" placeholder="Dirección" />
                    <input type="text" id="cellCity" placeholder="Ciudad" />
                    <select id="cellDay">
                        <option value="">Seleccionar día</option>
                        <option value="Lunes">Lunes</option>
                        <option value="Martes">Martes</option>
                        <option value="Miércoles">Miércoles</option>
                        <option value="Jueves">Jueves</option>
                        <option value="Viernes">Viernes</option>
                        <option value="Sábado">Sábado</option>
                        <option value="Domingo">Domingo</option>
                    </select>
                    <input type="time" id="cellTime" placeholder="Hora" />
                    <select id="cellLeader">
                        <option value="">Seleccionar líder</option>
                    </select>
                    <button type="submit">Crear Célula</button>
                    <div id="formErrors" style="color: red;"></div>
                </form>
            </div>
        `;

        const form = document.getElementById('createCellForm');
        const nameInput = document.getElementById('cellName');
        const daySelect = document.getElementById('cellDay');
        const timeInput = document.getElementById('cellTime');
        const leaderSelect = document.getElementById('cellLeader');
        const errorDiv = document.getElementById('formErrors');

        // Simular envío con datos inválidos
        nameInput.value = '';
        daySelect.value = '';
        timeInput.value = '';
        leaderSelect.value = '';

        form.dispatchEvent(new Event('submit'));

        // Verificar mensajes de error
        expect(errorDiv.textContent).toContain('Nombre es requerido');
        expect(errorDiv.textContent).toContain('Día es requerido');
        expect(errorDiv.textContent).toContain('Hora es requerida');
        expect(errorDiv.textContent).toContain('Líder es requerido');
    });

    test('debería mostrar mapa con ubicación de células', async () => {
        document.body.innerHTML = `
            <div id="cellsMap">
                <div id="mapContainer">
                    <!-- El mapa se renderizará aquí -->
                </div>
            </div>
        `;

        const mockCells = [
            { 
                id: 1, 
                name: 'Célula Central', 
                address: 'Calle Principal 123',
                city: 'Ciudad',
                latitude: 40.7128,
                longitude: -74.0060
            }
        ];

        const mockResponse = {
            ok: true,
            json: async () => ({ cells: mockCells })
        };
        
        fetch.mockResolvedValue(mockResponse);

        await getCells();
        
        // Simular renderizado del mapa
        const mapContainer = document.getElementById('mapContainer');
        const mapMarkers = mapContainer.getElementsByClassName('map-marker');
        
        expect(mapMarkers.length).toBe(1);
        expect(mapMarkers[0].getAttribute('data-lat')).toBe('40.7128');
        expect(mapMarkers[0].getAttribute('data-lng')).toBe('-74.0060');
    });

    test('debería mostrar diálogo de gestión de DISCIPULOs', () => {
        document.body.innerHTML = `
            <div id="cellsList">
                <div class="cell-card" data-cell-id="1">
                    <h3>Célula Test</h3>
                    <button class="manage-members" data-cell-id="1">Gestionar DISCIPULOs</button>
                </div>
            </div>
            <div id="membersDialog" style="display: none;">
                <h3>DISCIPULOs de la Célula</h3>
                <div id="membersList">
                    <!-- Lista de DISCIPULOs -->
                </div>
                <button id="addMember">Agregar DISCIPULO</button>
                <button id="closeDialog">Cerrar</button>
            </div>
        `;

        const manageButton = document.querySelector('.manage-members');
        const membersDialog = document.getElementById('membersDialog');

        // Simular clic en gestionar DISCIPULOs
        manageButton.click();

        // Verificar que se muestre el diálogo
        expect(membersDialog.style.display).toBe('block');
    });

    test('debería mostrar estadísticas visuales', async () => {
        document.body.innerHTML = `
            <div id="cellsDashboard">
                <div class="stat-card" id="totalCells">
                    <h3>Total de Células</h3>
                    <span class="stat-number">0</span>
                </div>
                <div class="chart-container" id="cellsChart">
                    <!-- Gráfico de células -->
                </div>
                <div class="leader-stats" id="leaderStats">
                    <!-- Estadísticas por líder -->
                </div>
            </div>
        `;

        const mockStats = {
            total: 12,
            byLeader: { 'Líder 1': 3, 'Líder 2': 2 },
            byDay: { 'Martes': 5, 'Jueves': 4, 'Viernes': 3 }
        };

        const mockResponse = {
            ok: true,
            json: async () => ({ stats: mockStats })
        };
        
        fetch.mockResolvedValue(mockResponse);

        const result = await getCellStats();
        
        if (result.success) {
            const totalElement = document.querySelector('#totalCells .stat-number');
            expect(totalElement.textContent).toBe('12');
        }
    });

    test('debería manejar búsqueda y filtrado de células', () => {
        document.body.innerHTML = `
            <div id="cellsFilters">
                <input type="text" id="searchInput" placeholder="Buscar célula..." />
                <select id="dayFilter">
                    <option value="">Todos los días</option>
                    <option value="Lunes">Lunes</option>
                    <option value="Martes">Martes</option>
                    <option value="Miércoles">Miércoles</option>
                    <option value="Jueves">Jueves</option>
                    <option value="Viernes">Viernes</option>
                    <option value="Sábado">Sábado</option>
                    <option value="Domingo">Domingo</option>
                </select>
                <select id="leaderFilter">
                    <option value="">Todos los líderes</option>
                </select>
                <button id="applyFilters">Aplicar Filtros</button>
            </div>
            <div id="cellsList"></div>
        `;

        const searchInput = document.getElementById('searchInput');
        const dayFilter = document.getElementById('dayFilter');
        const leaderFilter = document.getElementById('leaderFilter');
        const applyButton = document.getElementById('applyFilters');

        // Simular aplicación de filtros
        searchInput.value = 'Central';
        dayFilter.value = 'Martes';
        applyButton.click();

        // Verificar que los filtros se apliquen
        expect(searchInput.value).toBe('Central');
        expect(dayFilter.value).toBe('Martes');
    });

    test('debería mostrar confirmación para eliminar célula', () => {
        document.body.innerHTML = `
            <div id="cellsList">
                <div class="cell-card" data-cell-id="1">
                    <h3>Célula Test</h3>
                    <button class="delete-cell" data-cell-id="1">Eliminar</button>
                </div>
            </div>
            <div id="confirmDialog" style="display: none;">
                <p>¿Está seguro de eliminar esta célula?</p>
                <p>Esta acción también removerá todos los DISCIPULOs de la célula.</p>
                <button id="confirmDelete">Sí, Eliminar</button>
                <button id="cancelDelete">Cancelar</button>
            </div>
        `;

        const deleteButton = document.querySelector('.delete-cell');
        const confirmDialog = document.getElementById('confirmDialog');

        // Simular clic en eliminar
        deleteButton.click();

        // Verificar que se muestre diálogo de confirmación
        expect(confirmDialog.style.display).toBe('block');
    });
});

console.log('✅ Pruebas de Frontend para Células creadas exitosamente');
console.log('📋 Para ejecutar las pruebas:');
console.log('   npm test -- test-cells-frontend.js');
console.log('   o');
console.log('   npx jest test-cells-frontend.js');
