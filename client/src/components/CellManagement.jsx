import { useState, useEffect } from 'react';
import { Plus, Users, MapPin, Clock, Calendar, Trash2 } from 'lucide-react';

const CellManagement = () => {
    const [cells, setCells] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        leaderId: '',
        hostId: '',
        address: '',
        city: '',
        dayOfWeek: 'Viernes',
        time: '19:00'
    });
    const [eligibleLeaders, setEligibleLeaders] = useState([]);
    const [eligibleHosts, setEligibleHosts] = useState([]);

    // Management State
    const [selectedCell, setSelectedCell] = useState(null);
    const [eligibleMembers, setEligibleMembers] = useState([]);
    const [selectedMember, setSelectedMember] = useState('');

    useEffect(() => {
        fetchCells();
        fetchEligibleLeaders();
    }, []);

    // When leader changes, fetch eligible hosts (members of that leader's network)
    useEffect(() => {
        if (formData.leaderId) {
            fetchEligibleHosts(formData.leaderId);
            // Reset host when leader changes
            setFormData(prev => ({ ...prev, hostId: '' }));
        }
    }, [formData.leaderId]);

    // Fetch eligible members when manage view opens
    useEffect(() => {
        if (selectedCell) {
            fetchEligibleMembers();
        }
    }, [selectedCell]);

    const fetchCells = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/enviar/cells', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setCells(data);
        } catch (error) {
            console.error('Error fetching cells:', error);
        }
    };

    const fetchEligibleLeaders = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/enviar/eligible-leaders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setEligibleLeaders(data);
        } catch (error) {
            console.error('Error fetching leaders:', error);
        }
    };

    const fetchEligibleHosts = async (leaderId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/enviar/eligible-hosts?leaderId=${leaderId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setEligibleHosts(data);
        } catch (error) {
            console.error('Error fetching hosts:', error);
        }
    };

    const fetchEligibleMembers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/enviar/eligible-members', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setEligibleMembers(data);
        } catch (error) {
            console.error('Error fetching members:', error);
        }
    };

    const handleDeleteCell = async (cellId) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta célula? Esta acción desvinculará a todos sus miembros.')) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/enviar/cells/${cellId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Error al eliminar la célula');
            }

            alert('Célula eliminada exitosamente');
            fetchCells();
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/enviar/cells', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Error creating cell');
            }

            alert('Célula creada exitosamente');
            setShowCreateForm(false);
            setFormData({
                name: '', leaderId: '', hostId: '', address: '', city: '', dayOfWeek: 'Viernes', time: '19:00'
            });
            fetchCells();
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignMember = async () => {
        if (!selectedCell || !selectedMember) return;
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/enviar/cells/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    cellId: selectedCell.id,
                    userId: selectedMember
                })
            });

            if (!response.ok) throw new Error('Error assigning member');

            alert('Miembro asignado exitosamente');
            setSelectedMember('');
            fetchCells();
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

                <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">{selectedCell.name}</h2>
                            <p className="text-gray-500">Gestión de miembros y detalles</p>
                        </div>
                        <span className="text-sm font-semibold px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                            {selectedCell._count?.members || 0} Miembros Actuales
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg mb-8">
                        <div>
                            <p className="mb-2"><strong className="text-gray-800">Líder:</strong> {selectedCell.leader?.fullName}</p>
                            <p className="mb-2"><strong className="text-gray-800">Día/Hora:</strong> {selectedCell.dayOfWeek} {selectedCell.time}</p>
                        </div>
                        <div>
                            <p className="mb-2"><strong className="text-gray-800">Ciudad:</strong> {selectedCell.city}</p>
                            <p className="mb-2"><strong className="text-gray-800">Dirección:</strong> {selectedCell.address}</p>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Asignar Miembro
                        </h3>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <select
                                    value={selectedMember}
                                    onChange={(e) => setSelectedMember(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccionar miembro de la red...</option>
                                    {eligibleMembers.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.fullName} {m.cellId ? `(Ya en: ${m.cell?.name})` : '(Sin célula)'} - {m.role}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Se muestran miembros de tu red. Puedes reasignar miembros de otras células.
                                </p>
                            </div>
                            <button
                                onClick={handleAssignMember}
                                disabled={loading || !selectedMember}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors h-fit"
                            >
                                {loading ? 'Asignando...' : 'Asignar a Célula'}
                            </button>
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
                <h2 className="text-xl font-semibold text-gray-800">Células</h2>
                <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={20} />
                    {showCreateForm ? 'Cancelar' : 'Crear Nueva Célula'}
                </button>
            </div>

            {showCreateForm && (
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="text-lg font-medium mb-4">Nueva Célula</h3>
                    <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Célula</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Ej: Célula Betania"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Líder de Célula</label>
                            <select
                                required
                                value={formData.leaderId}
                                onChange={e => setFormData({ ...formData, leaderId: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar Líder...</option>
                                {eligibleLeaders.map(l => (
                                    <option key={l.id} value={l.id}>{l.fullName}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Anfitrión</label>
                            <select
                                required
                                value={formData.hostId}
                                onChange={e => setFormData({ ...formData, hostId: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                disabled={!formData.leaderId}
                            >
                                <option value="">Seleccionar Anfitrión...</option>
                                {eligibleHosts.map(h => (
                                    <option key={h.id} value={h.id}>{h.fullName} ({h.role})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Día</label>
                            <select
                                required
                                value={formData.dayOfWeek}
                                onChange={e => setFormData({ ...formData, dayOfWeek: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                            <input
                                type="time"
                                required
                                value={formData.time}
                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                            <input
                                type="text"
                                required
                                value={formData.city}
                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                            <input
                                type="text"
                                required
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="md:col-span-2 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                            >
                                {loading ? 'Creando...' : 'Guardar Célula'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List of Cells */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cells.map(cell => (
                    <div key={cell.id} className="bg-white rounded-lg shadow p-6 border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-gray-800">{cell.name}</h3>
                            <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                {cell.members ? cell._count?.members || 0 : 0} Miembros
                            </span>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-gray-400" />
                                <span>Líder: {cell.leader?.fullName}</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                            <button
                                onClick={() => setSelectedCell(cell)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                                Administrar
                            </button>
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
