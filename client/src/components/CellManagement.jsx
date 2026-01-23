import { useState, useEffect } from 'react';
import { Plus, Users, MapPin, Clock, Calendar, Trash2 } from 'lucide-react';
import api from '../utils/api';

const CellManagement = () => {
    const [cells, setCells] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingCellId, setEditingCellId] = useState(null);
    const [assignedMembers, setAssignedMembers] = useState([]);

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        leaderId: '',
        hostId: '',
        liderDoceId: '',
        address: '',
        city: '',
        dayOfWeek: 'Viernes',
        time: '19:00',
        cellType: 'ABIERTA'
    });
    const [eligibleLeaders, setEligibleLeaders] = useState([]);
    const [eligibleHosts, setEligibleHosts] = useState([]);
    const [eligibleDoceLeaders, setEligibleDoceLeaders] = useState([]);

    // Filtering
    const [filterDoce, setFilterDoce] = useState('');

    // Management State
    const [selectedCell, setSelectedCell] = useState(null);
    const [eligibleMembers, setEligibleMembers] = useState([]);
    const [selectedMember, setSelectedMember] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        fetchCells();
        fetchEligibleLeaders();
        fetchEligibleDoceLeaders();
        const storedUser = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(storedUser);
    }, []);

    // When leader changes, fetch eligible hosts (members of that leader's network)
    useEffect(() => {
        if (formData.leaderId) {
            fetchEligibleHosts(formData.leaderId);
            // Reset host ONLY if we are creating a new cell (not during initial edit setup)
            if (!isEditing) {
                setFormData(prev => ({ ...prev, hostId: '' }));
            }
        }
    }, [formData.leaderId]);

    // Handle default values for PASTOR and LIDER_DOCE roles when opening create form
    useEffect(() => {
        if (showCreateForm && currentUser) {
            const roles = currentUser.roles || [];
            if (roles.includes('PASTOR')) {
                setFormData(prev => ({
                    ...prev,
                    leaderId: currentUser.id.toString(),
                    liderDoceId: '' // Pastor might need to select a specific leader 12 or leave empty if supervising directly
                }));
            } else if (roles.includes('LIDER_DOCE')) {
                setFormData(prev => ({
                    ...prev,
                    liderDoceId: currentUser.id.toString()
                }));
            }
        }
    }, [showCreateForm, currentUser]);

    // Fetch eligible members and assigned members when manage view opens
    useEffect(() => {
        if (selectedCell) {
            fetchEligibleMembers(selectedCell.leaderId, selectedCell.cellType);
            fetchAssignedMembers(selectedCell.id);
        }
    }, [selectedCell]);

    const fetchCells = async () => {
        try {
            const response = await api.get('/enviar/cells');
            setCells(response.data);

            // If we are currently managing a cell, update its data too
            if (selectedCell) {
                const updated = response.data.find(c => c.id === selectedCell.id);
                if (updated) setSelectedCell(updated);
            }
        } catch (error) {
            console.error('Error fetching cells:', error);
        }
    };

    const fetchEligibleLeaders = async () => {
        try {
            const response = await api.get('/enviar/eligible-leaders');
            setEligibleLeaders(response.data);
        } catch (error) {
            console.error('Error fetching leaders:', error);
        }
    };

    const fetchEligibleHosts = async (leaderId) => {
        try {
            const response = await api.get('/enviar/eligible-hosts', {
                params: { leaderId }
            });
            setEligibleHosts(response.data);
        } catch (error) {
            console.error('Error fetching hosts:', error);
        }
    };

    const fetchEligibleMembers = async (leaderId, cellType) => {
        try {
            const response = await api.get('/enviar/eligible-members', {
                params: { leaderId, cellType }
            });
            setEligibleMembers(response.data);
        } catch (error) {
            console.error('Error fetching members:', error);
        }
    };

    const fetchAssignedMembers = async (cellId) => {
        try {
            const response = await api.get(`/enviar/cells/${cellId}/members`);
            setAssignedMembers(response.data);
        } catch (error) {
            console.error('Error fetching assigned members:', error);
        }
    };

    const fetchEligibleDoceLeaders = async () => {
        try {
            const response = await api.get('/enviar/eligible-doce-leaders');
            setEligibleDoceLeaders(response.data);
        } catch (error) {
            console.error('Error fetching doce leaders:', error);
        }
    };

    const handleDeleteCell = async (cellId) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta célula? Esta acción desvinculará a todos sus Discípulos.')) return;

        try {
            setLoading(true);
            await api.delete(`/enviar/cells/${cellId}`);
            alert('Célula eliminada exitosamente');
            fetchCells();
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let response;
            if (isEditing) {
                response = await api.put(`/enviar/cells/${editingCellId}`, formData);
                alert('Célula actualizada exitosamente');
            } else {
                response = await api.post('/enviar/cells', formData);
                const newCell = response.data;
                const geoStatus = (newCell.latitude && newCell.longitude)
                    ? 'y georreferenciada correctamente'
                    : 'pero no se pudo obtener su ubicación en el mapa. Verifique la dirección más tarde.';
                alert(`Célula creada exitosamente ${geoStatus}`);
            }

            setShowCreateForm(false);
            setIsEditing(false);
            setEditingCellId(null);
            setFormData({
                name: '', leaderId: '', hostId: '', liderDoceId: '', address: '', city: '', dayOfWeek: 'Viernes', time: '19:00', cellType: 'ABIERTA'
            });
            fetchCells();
        } catch (error) {
            alert(error.response?.data?.error || error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (cell) => {
        setFormData({
            name: cell.name || '',
            leaderId: cell.leaderId?.toString() || '',
            hostId: cell.hostId?.toString() || '',
            liderDoceId: cell.liderDoceId?.toString() || '',
            address: cell.address || '',
            city: cell.city || '',
            dayOfWeek: cell.dayOfWeek || 'Viernes',
            time: cell.time || '19:00',
            cellType: cell.cellType || 'ABIERTA'
        });
        setIsEditing(true);
        setEditingCellId(cell.id);
        setShowCreateForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAssignMember = async () => {
        if (!selectedCell || !selectedMember) return;
        try {
            setLoading(true);
            await api.post('/enviar/cells/assign', {
                cellId: selectedCell.id,
                userId: selectedMember
            });

            alert('Discípulo asignado exitosamente');
            setSelectedMember('');
            fetchCells(); // Refresh count
            fetchAssignedMembers(selectedCell.id); // Refresh list
            fetchEligibleMembers(selectedCell.leaderId, selectedCell.cellType); // Refresh eligible
        } finally {
            setLoading(false);
        }
    };

    const handleUnassignMember = async (userId) => {
        if (!confirm('¿Estás seguro de que deseas desvincular a este miembro de la célula?')) return;
        try {
            setLoading(true);
            await api.post('/enviar/cells/unassign', { userId });
            alert('Miembro desvinculado correctamente');
            fetchCells();
            fetchAssignedMembers(selectedCell.id);
            fetchEligibleMembers(selectedCell.leaderId, selectedCell.cellType);
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCoordinates = async (cellId) => {
        try {
            setLoading(true);
            const response = await api.post(`/enviar/cells/${cellId}/coordinates`);
            const updatedCell = response.data;
            alert('Coordenadas actualizadas exitosamente');

            // Update state locally
            setCells(prev => prev.map(c => c.id === cellId ? { ...c, ...updatedCell } : c));
            if (selectedCell && selectedCell.id === cellId) {
                setSelectedCell(prev => ({ ...prev, ...updatedCell }));
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Management View
    if (selectedCell) {
        return (
            <div className="space-y-6">
                <button
                    onClick={() => setSelectedCell(null)}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                >
                    &larr; Volver al listado
                </button>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{selectedCell.name}</h2>
                            <p className="text-gray-500 dark:text-gray-400">Gestión de Discípulos y detalles</p>
                        </div>
                        <span className="text-sm font-semibold px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                            {selectedCell._count?.members || 0} Discípulos Actuales
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-8">
                        <div>
                            <p className="mb-2"><strong className="text-gray-800 dark:text-white">Líder:</strong> {selectedCell.leader?.fullName} <span className="text-xs text-gray-400 capitalize">({selectedCell.leader?.role?.toLowerCase()})</span></p>
                            <p className="mb-2"><strong className="text-gray-800 dark:text-white">Líder 12:</strong> {selectedCell.liderDoce?.fullName || <span className="text-gray-400 italic">No asignado</span>}</p>
                            <p className="mb-2"><strong className="text-gray-800 dark:text-white">Día/Hora:</strong> {selectedCell.dayOfWeek} {selectedCell.time}</p>
                            <p className="mb-2"><strong className="text-gray-800 dark:text-white">Tipo:</strong> <span className={selectedCell.cellType === 'CERRADA' ? 'text-amber-600 font-bold' : 'text-green-600 font-bold'}>{selectedCell.cellType}</span></p>
                        </div>
                        <div>
                            <p className="mb-2"><strong className="text-gray-800 dark:text-white">Ciudad:</strong> {selectedCell.city}</p>
                            <p className="mb-2"><strong className="text-gray-800 dark:text-white">Dirección:</strong> {selectedCell.address}</p>
                            <div className="flex items-center gap-3">
                                <p><strong className="text-gray-800 dark:text-white">Coordenadas:</strong> {
                                    selectedCell.latitude && selectedCell.longitude
                                        ? `${selectedCell.latitude.toFixed(6)}, ${selectedCell.longitude.toFixed(6)}`
                                        : <span className="text-red-400 italic">Sin georreferenciar</span>
                                }</p>
                                <button
                                    onClick={() => handleUpdateCoordinates(selectedCell.id)}
                                    disabled={loading}
                                    className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400 font-bold transition-all"
                                    title="Reintentar obtener coordenadas del mapa"
                                >
                                    Georreferenciar Ahora
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                            <Users className="w-5 h-5 text-blue-600" />
                            Asignar Nuevo Discípulo
                        </h3>
                        <div className="flex flex-col md:flex-row gap-4 mb-8">
                            <div className="flex-1">
                                <select
                                    value={selectedMember}
                                    onChange={(e) => setSelectedMember(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">Seleccionar Discípulo de la red...</option>
                                    {eligibleMembers.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.fullName} {m.cellId ? `(Ya en: ${m.cell?.name})` : '(Sin célula)'} - {m.role}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleAssignMember}
                                disabled={loading || !selectedMember}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors h-fit"
                            >
                                {loading ? 'Asignando...' : 'Asignar a Célula'}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800 dark:text-white">
                                <Users className="w-5 h-5 text-green-600" />
                                Discípulos Asignados
                            </h3>
                            {assignedMembers.length === 0 ? (
                                <p className="text-gray-500 italic text-sm">No hay discípulos asignados a esta célula.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {assignedMembers.map(member => (
                                        <div key={member.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div>
                                                <p className="font-medium text-gray-800 dark:text-white">{member.fullName}</p>
                                                <p className="text-xs text-gray-500">{member.role}</p>
                                            </div>
                                            <button
                                                onClick={() => handleUnassignMember(member.id)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                title="Quitar de esta célula"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // List & Create View
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Células</h2>
                <button
                    onClick={() => {
                        if (showCreateForm) {
                            setIsEditing(false);
                            setEditingCellId(null);
                            setFormData({
                                name: '', leaderId: '', hostId: '', liderDoceId: '', address: '', city: '', dayOfWeek: 'Viernes', time: '19:00', cellType: 'ABIERTA'
                            });
                        }
                        setShowCreateForm(!showCreateForm);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={20} />
                    {showCreateForm ? 'Cancelar' : 'Crear Nueva Célula'}
                </button>
            </div>

            {showCreateForm && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">
                        {isEditing ? `Editar Célula: ${formData.name}` : 'Nueva Célula'}
                    </h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la Célula</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Ej: Célula Barrio: Bosques del Norte"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Célula</label>
                            <select
                                required
                                value={formData.cellType}
                                onChange={e => setFormData({ ...formData, cellType: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="ABIERTA">Célula Abierta (Discipulados, Invitados)</option>
                                <option value="CERRADA">Célula Cerrada (Solo Líderes de 12 a Lideres de Celula)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {currentUser?.roles?.includes('PASTOR') ? 'Pastor' : 'Líder G12 Supervisor (Opcional)'}
                            </label>
                            <select
                                value={formData.liderDoceId}
                                onChange={e => setFormData({ ...formData, liderDoceId: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="">
                                    {currentUser?.roles?.includes('PASTOR') ? 'Seleccionar Pastor...' : 'Seleccionar Líder 12...'}
                                </option>
                                {eligibleDoceLeaders.map(l => (
                                    <option key={l.id} value={l.id}>{l.fullName}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Líder de Célula</label>
                            <select
                                required
                                value={formData.leaderId}
                                onChange={e => setFormData({ ...formData, leaderId: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="">Seleccionar Líder...</option>
                                {eligibleLeaders.map(l => (
                                    <option key={l.id} value={l.id}>{l.fullName} ({l.role})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anfitrión</label>
                            <select
                                required
                                value={formData.hostId}
                                onChange={e => setFormData({ ...formData, hostId: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                disabled={!formData.leaderId}
                            >
                                <option value="">Seleccionar Anfitrión...</option>
                                {eligibleHosts.map(h => (
                                    <option key={h.id} value={h.id}>{h.fullName} ({h.role})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Día</label>
                            <select
                                required
                                value={formData.dayOfWeek}
                                onChange={e => setFormData({ ...formData, dayOfWeek: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora</label>
                            <input
                                type="time"
                                required
                                value={formData.time}
                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ciudad</label>
                            <input
                                type="text"
                                required
                                value={formData.city}
                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
                            <input
                                type="text"
                                required
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>

                        <div className="md:col-span-2 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                            >
                                {loading ? (isEditing ? 'Actualizando...' : 'Creando...') : (isEditing ? 'Actualizar Célula' : 'Guardar Célula')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                        value={filterDoce}
                        onChange={(e) => setFilterDoce(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-blue-100 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 appearance-none bg-white dark:bg-gray-700 dark:text-white text-sm"
                    >
                        <option value="">{currentUser?.roles?.includes('PASTOR') ? 'Todos los Pastores' : 'Todos los Líderes 12'}</option>
                        {eligibleDoceLeaders.map(l => (
                            <option key={l.id} value={l.id}>{l.fullName}</option>
                        ))}
                    </select>
                </div>
                <p className="text-xs text-gray-500 whitespace-nowrap">
                    Mostrando {cells.filter(c => !filterDoce || c.liderDoceId === parseInt(filterDoce)).length} células
                </p>
            </div>

            {/* List of Cells */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cells
                    .filter(cell => !filterDoce || cell.liderDoceId === parseInt(filterDoce))
                    .map(cell => (
                        <div key={cell.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">{cell.name}</h3>
                                <div className="flex gap-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cell.cellType === 'CERRADA' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                                        {cell.cellType}
                                    </span>
                                    <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                                        {cell._count?.members || 0}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <div className="flex items-center gap-2">
                                    <Users size={16} className="text-gray-400" />
                                    <span><strong className="text-gray-700 dark:text-gray-300">Líder:</strong> {cell.leader?.fullName}</span>
                                </div>
                                {cell.liderDoce && (
                                    <div className="flex items-center gap-2">
                                        <Users size={16} className="text-blue-300" />
                                        <span><strong className="text-gray-700 dark:text-gray-300">Líder 12:</strong> {cell.liderDoce?.fullName}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-gray-400" />
                                    <span><strong className="text-gray-700 dark:text-gray-300">Ciudad:</strong> {cell.city}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-gray-400" />
                                    <span><strong className="text-gray-700 dark:text-gray-300">Horario:</strong> {cell.dayOfWeek} {cell.time}</span>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                    <MapPin size={16} className="text-blue-400" />
                                    <span className="text-xs text-gray-500 italic">
                                        {cell.latitude && cell.longitude
                                            ? `${cell.latitude.toFixed(4)}, ${cell.longitude.toFixed(4)}`
                                            : 'Sin ubicación en mapa'
                                        }
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setSelectedCell(cell)}
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    >
                                        Administrar
                                    </button>
                                    <button
                                        onClick={() => handleEditClick(cell)}
                                        className="text-amber-600 hover:text-amber-800 text-sm font-medium"
                                    >
                                        Editar
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleDeleteCell(cell.id)}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                                >
                                    <Trash2 size={16} />
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
};

export default CellManagement;
