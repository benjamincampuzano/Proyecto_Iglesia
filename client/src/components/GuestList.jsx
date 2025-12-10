import { useState, useEffect } from 'react';
import { Search, Filter, Edit2, Trash2, UserPlus, Loader, X, Save, UserCheck } from 'lucide-react';
import UserSearchSelect from './UserSearchSelect';
import axios from 'axios';

const GuestList = ({ refreshTrigger }) => {
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [invitedByFilter, setInvitedByFilter] = useState(null);
    const [editingGuest, setEditingGuest] = useState(null);
    const [assigningGuest, setAssigningGuest] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [convertingGuest, setConvertingGuest] = useState(null);
    const [conversionEmail, setConversionEmail] = useState('');
    const [conversionPassword, setConversionPassword] = useState('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
    }, []);

    useEffect(() => {
        fetchGuests();
    }, [refreshTrigger, statusFilter, invitedByFilter]);

    const fetchGuests = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();

            if (statusFilter) params.append('status', statusFilter);
            if (invitedByFilter) params.append('invitedById', invitedByFilter);
            if (searchTerm) params.append('search', searchTerm);

            const res = await axios.get(`http://localhost:5000/api/guests?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setGuests(res.data.guests);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cargar invitados');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchGuests();
    };

    const handleUpdateGuest = async (guestId, updates) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/guests/${guestId}`, updates, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setEditingGuest(null);
            fetchGuests();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al actualizar invitado');
        }
    };

    const handleDeleteGuest = async (guestId) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este invitado?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/guests/${guestId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            fetchGuests();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al eliminar invitado');
        }
    };

    const handleAssignGuest = async (guestId, assignedToId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/guests/${guestId}/assign`,
                { assignedToId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setAssigningGuest(null);
            fetchGuests();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al asignar invitado');
        }
    };

    const handleConvertToMember = async () => {
        if (!conversionEmail || !conversionPassword) {
            setError('Email y contraseña son requeridos');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `http://localhost:5000/api/guests/${convertingGuest.id}/convert-to-member`,
                { email: conversionEmail, password: conversionPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setConvertingGuest(null);
            setConversionEmail('');
            setConversionPassword('');
            fetchGuests();
            alert('Invitado ganado a miembro exitosamente');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al convertir invitado');
        }
    };

    const getStatusBadgeColor = (status) => {
        const colors = {
            NUEVO: 'bg-blue-900/30 text-blue-400',
            CONTACTADO: 'bg-yellow-900/30 text-yellow-400',
            EN_CONSOLIDACION: 'bg-purple-900/30 text-purple-400',
            GANADO: 'bg-green-900/30 text-green-400',
        };
        return colors[status] || 'bg-gray-900/30 text-gray-400';
    };

    const getStatusLabel = (status) => {
        const labels = {
            NUEVO: 'Nuevo',
            CONTACTADO: 'Contactado',
            EN_CONSOLIDACION: 'En Consolidación',
            GANADO: 'Ganado',
        };
        return labels[status] || status;
    };

    // Permission helper functions
    const canEditAllFields = (guest) => {
        return currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'LIDER_DOCE';
    };

    const canDelete = (guest) => {
        if (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'LIDER_DOCE') {
            return true;
        }
        // LIDER_CELULA/MIEMBRO can only delete guests they invited
        return guest.invitedBy?.id === currentUser?.id;
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Lista de Invitados</h2>

            {error && (
                <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Buscar por nombre o teléfono..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Todos los estados</option>
                        <option value="NUEVO">Nuevo</option>
                        <option value="CONTACTADO">Contactado</option>
                        <option value="EN_CONSOLIDACION">En Consolidación</option>
                        <option value="GANADO">Ganado</option>
                    </select>
                </div>

                <div>
                    <UserSearchSelect
                        value={invitedByFilter}
                        onChange={setInvitedByFilter}
                        placeholder="Filtrar por quien invitó..."
                    />
                </div>
            </div>

            <button
                onClick={handleSearch}
                className="mb-6 flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
                <Filter size={20} />
                <span>Aplicar Filtros</span>
            </button>

            {/* Guest Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-700">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">Nombre</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">Teléfono</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">Estado</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">Invitado Por</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">Asignado A</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-200">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                                    <Loader size={24} className="animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : guests.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                                    No se encontraron invitados
                                </td>
                            </tr>
                        ) : (
                            guests.map((guest) => (
                                <tr key={guest.id} className="hover:bg-gray-700/50">
                                    <td className="px-4 py-3">
                                        {editingGuest?.id === guest.id ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={editingGuest.name}
                                                    onChange={(e) =>
                                                        setEditingGuest({ ...editingGuest, name: e.target.value })
                                                    }
                                                    disabled={!canEditAllFields(guest)}
                                                    className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                    placeholder="Nombre"
                                                />
                                                <input
                                                    type="text"
                                                    value={editingGuest.address || ''}
                                                    onChange={(e) =>
                                                        setEditingGuest({ ...editingGuest, address: e.target.value })
                                                    }
                                                    disabled={!canEditAllFields(guest)}
                                                    className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                                    placeholder="Dirección"
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-white text-sm font-medium">{guest.name}</p>
                                                {guest.address && (
                                                    <p className="text-gray-400 text-xs">{guest.address}</p>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingGuest?.id === guest.id ? (
                                            <input
                                                type="text"
                                                value={editingGuest.phone}
                                                onChange={(e) =>
                                                    setEditingGuest({ ...editingGuest, phone: e.target.value })
                                                }
                                                disabled={!canEditAllFields(guest)}
                                                className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        ) : (
                                            <span className="text-gray-300 text-sm">{guest.phone}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingGuest?.id === guest.id ? (
                                            <select
                                                value={editingGuest.status}
                                                onChange={(e) =>
                                                    setEditingGuest({ ...editingGuest, status: e.target.value })
                                                }
                                                className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                                            >
                                                <option value="NUEVO">Nuevo</option>
                                                <option value="CONTACTADO">Contactado</option>
                                                <option value="EN_CONSOLIDACION">En Consolidación</option>
                                                <option value="GANADO">Ganado</option>
                                            </select>
                                        ) : (
                                            <span className={`inline-block px-2 py-1 rounded text-xs ${getStatusBadgeColor(guest.status)}`}>
                                                {getStatusLabel(guest.status)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingGuest?.id === guest.id ? (
                                            canEditAllFields(guest) ? (
                                                <UserSearchSelect
                                                    value={editingGuest.invitedById}
                                                    onChange={(userId) => setEditingGuest({ ...editingGuest, invitedById: userId })}
                                                    placeholder="Invitado por..."
                                                />
                                            ) : (
                                                <p className="text-white text-sm">{guest.invitedBy?.fullName || 'N/A'}</p>
                                            )
                                        ) : (
                                            <p className="text-white text-sm">{guest.invitedBy?.fullName || 'N/A'}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingGuest?.id === guest.id ? (
                                            <div className="flex items-center space-x-2">
                                                <UserSearchSelect
                                                    value={editingGuest.assignedToId}
                                                    onChange={(userId) => setEditingGuest({ ...editingGuest, assignedToId: userId })}
                                                    placeholder="Asignar a..."
                                                />
                                                {editingGuest.assignedToId && (
                                                    <button
                                                        onClick={() => setEditingGuest({ ...editingGuest, assignedToId: null })}
                                                        className="text-gray-400 hover:text-white"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            assigningGuest?.id === guest.id ? (
                                                <div className="flex items-center space-x-2">
                                                    <UserSearchSelect
                                                        value={assigningGuest.assignedToId}
                                                        onChange={(userId) => {
                                                            if (userId) {
                                                                handleAssignGuest(guest.id, userId);
                                                            }
                                                        }}
                                                        placeholder="Seleccionar líder..."
                                                    />
                                                    <button
                                                        onClick={() => setAssigningGuest(null)}
                                                        className="p-1 text-gray-400 hover:text-white"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            ) : guest.assignedTo ? (
                                                <p className="text-white text-sm">{guest.assignedTo.fullName}</p>
                                            ) : (
                                                <button
                                                    onClick={() => setAssigningGuest({ id: guest.id, assignedToId: null })}
                                                    className="text-blue-400 hover:text-blue-300 text-sm"
                                                >
                                                    Asignar
                                                </button>
                                            )
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end space-x-2">
                                            {editingGuest?.id === guest.id ? (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            handleUpdateGuest(guest.id, {
                                                                name: editingGuest.name,
                                                                phone: editingGuest.phone,
                                                                address: editingGuest.address,
                                                                status: editingGuest.status,
                                                                invitedById: editingGuest.invitedById,
                                                                assignedToId: editingGuest.assignedToId
                                                            })
                                                        }
                                                        className="p-1 text-green-400 hover:text-green-300"
                                                        title="Guardar"
                                                    >
                                                        <Save size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingGuest(null)}
                                                        className="p-1 text-gray-400 hover:text-gray-300"
                                                        title="Cancelar"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setEditingGuest({
                                                            ...guest,
                                                            invitedById: guest.invitedBy?.id,
                                                            assignedToId: guest.assignedTo?.id
                                                        })}
                                                        className="p-1 text-blue-400 hover:text-blue-300"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    {canDelete(guest) && (
                                                        <button
                                                            onClick={() => handleDeleteGuest(guest.id)}
                                                            className="p-1 text-red-400 hover:text-red-300"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setConvertingGuest(guest)}
                                                        className="p-1 text-green-400 hover:text-green-300"
                                                        title="Convertir a Miembro"
                                                    >
                                                        <UserCheck size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Convert to Member Modal */}
            {convertingGuest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
                        <h3 className="text-xl font-bold text-white mb-4">
                            Convertir a Miembro: {convertingGuest.name}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={conversionEmail}
                                    onChange={(e) => setConversionEmail(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={conversionPassword}
                                    onChange={(e) => setConversionPassword(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                                    placeholder="Contraseña"
                                />
                            </div>
                            <div className="flex justify-end space-x-2 mt-6">
                                <button
                                    onClick={() => {
                                        setConvertingGuest(null);
                                        setConversionEmail('');
                                        setConversionPassword('');
                                    }}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConvertToMember}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                >
                                    Convertir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuestList;
