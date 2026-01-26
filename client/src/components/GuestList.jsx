import { useState } from 'react';
import { Search, Filter, Edit2, Trash2, UserPlus, Loader, X, Save, UserCheck } from 'lucide-react';
import PropTypes from 'prop-types';
import UserSearchSelect from './UserSearchSelect';
import useGuestManagement from '../hooks/useGuestManagement';

const GuestList = ({ refreshTrigger }) => {
    const {
        guests,
        loading,
        error,
        setError,
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        invitedByFilter,
        setInvitedByFilter,
        liderDoceFilter,
        setLiderDoceFilter,
        currentUser,
        fetchGuests,
        updateGuest,
        deleteGuest,
        convertGuestToMember,
    } = useGuestManagement({ refreshTrigger });

    const [editingGuest, setEditingGuest] = useState(null);
    const [convertingGuest, setConvertingGuest] = useState(null);
    const [conversionEmail, setConversionEmail] = useState('');
    const [conversionPassword, setConversionPassword] = useState('');

    const handleSearch = () => {
        fetchGuests();
    };

    const handleUpdateGuest = async (guestId, updates) => {
        const res = await updateGuest(guestId, updates);
        if (res.success) setEditingGuest(null);
    };

    const handleDeleteGuest = async (guestId) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este invitado?')) return;
        await deleteGuest(guestId);
    };

    const handleConvertToMember = async () => {
        if (!conversionEmail || !conversionPassword) {
            setError('Email y contraseña son requeridos');
            return;
        }

        const res = await convertGuestToMember(convertingGuest.id, { email: conversionEmail, password: conversionPassword });
        if (!res.success) return;

        setConvertingGuest(null);
        setConversionEmail('');
        setConversionPassword('');
        alert('Invitado consolidado a Discípulo exitosamente');
    };

    const getStatusBadgeColor = (status) => {
        const colors = {
            NUEVO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            CONTACTADO: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            CONSOLIDADO: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
            GANADO: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        };
        return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    };

    const getStatusLabel = (status) => {
        const labels = {
            NUEVO: 'Nuevo',
            CONTACTADO: 'Llamado',
            CONSOLIDADO: 'Visitado',
            GANADO: 'Consolidado',
        };
        return labels[status] || status;
    };

    // Funciones auxiliares de permisos
    const canEditAllFields = (guest) => {
        const roles = currentUser?.roles || [];
        return roles.includes('ADMIN') || roles.includes('LIDER_DOCE') || roles.includes('PASTOR');
    };

    const canDelete = (guest) => {
        const roles = currentUser?.roles || [];
        if (roles.includes('ADMIN') || roles.includes('LIDER_DOCE') || roles.includes('PASTOR')) {
            return true;
        }
        // LIDER_CELULA/DISCIPULO solo pueden eliminar invitados que invitaron
        return guest.invitedBy?.id === currentUser?.id;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Lista de Invitados</h2>

            {error && (
                <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Buscar por nombre..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Estado (Todos)</option>
                        <option value="NUEVO">Nuevo</option>
                        <option value="CONTACTADO">Llamado</option>
                        <option value="CONSOLIDADO">Visitado</option>
                        <option value="GANADO">Consolidado</option>
                    </select>
                </div>

                <div>
                    <UserSearchSelect
                        value={invitedByFilter}
                        onChange={setInvitedByFilter}
                        placeholder="Invitado por..."
                    />
                </div>

                <div>
                    <UserSearchSelect
                        value={liderDoceFilter}
                        onChange={setLiderDoceFilter}
                        placeholder={currentUser?.roles?.includes('PASTOR') ? "Líder de Célula..." : "Ministerio de..."}
                        roleFilter={currentUser?.roles?.includes('PASTOR') ? "LIDER_DOCE,PASTOR" : "LIDER_DOCE"}
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

            {/* Tabla de Invitados */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Nombre</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Teléfono</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Estado</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Invitado Por</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-200">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="px-4 py-8 text-center text-gray-400">
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
                                <tr key={guest.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
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
                                                    className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                    placeholder="Nombre"
                                                />
                                                <input
                                                    type="text"
                                                    value={editingGuest.address || ''}
                                                    onChange={(e) =>
                                                        setEditingGuest({ ...editingGuest, address: e.target.value })
                                                    }
                                                    disabled={!canEditAllFields(guest)}
                                                    className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                                    placeholder="Dirección"
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-gray-900 dark:text-white text-sm font-medium">{guest.name}</p>
                                                {guest.address && (
                                                    <p className="text-gray-500 dark:text-gray-400 text-xs">{guest.address}</p>
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
                                                className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        ) : (
                                            <span className="text-gray-600 dark:text-gray-300 text-sm">{guest.phone}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingGuest?.id === guest.id ? (
                                            <select
                                                value={editingGuest.status}
                                                onChange={(e) =>
                                                    setEditingGuest({ ...editingGuest, status: e.target.value })
                                                }
                                                className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white text-sm"
                                            >
                                                <option value="NUEVO">Nuevo</option>
                                                <option value="CONTACTADO">Llamado</option>
                                                <option value="CONSOLIDADO">Visitado</option>
                                                <option value="GANADO">Consolidado</option>
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
                                                <p className="text-gray-900 dark:text-white text-sm">{guest.invitedBy?.fullName || 'N/A'}</p>
                                            )
                                        ) : (
                                            <p className="text-gray-900 dark:text-white text-sm">{guest.invitedBy?.fullName || 'N/A'}</p>
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
                                                                invitedById: editingGuest.invitedById
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
                                                            invitedById: guest.invitedBy?.id
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
                                                        title="Convertir a Discípulo"
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

            {/* Modal para convertir a Discípulo */}
            {convertingGuest && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-xl">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            Convertir a Discípulo: {convertingGuest.name}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={conversionEmail}
                                    onChange={(e) => setConversionEmail(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={conversionPassword}
                                    onChange={(e) => setConversionPassword(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
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
                                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded transition-colors"
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

GuestList.propTypes = {
    refreshTrigger: PropTypes.any,
};
