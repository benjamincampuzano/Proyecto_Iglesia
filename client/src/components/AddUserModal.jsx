import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Loader2 } from 'lucide-react';
import api from '../utils/api';

/**
 * Modal component for adding users to a leader's network
 * Displays available users and allows selection and assignment
 */
const AddUserModal = ({ isOpen, onClose, leaderId, leaderName, onUserAdded }) => {
    const [availableUsers, setAvailableUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Fetch available users when modal opens
    useEffect(() => {
        if (isOpen && leaderId) {
            fetchAvailableUsers();
        }
    }, [isOpen, leaderId]);

    // Filter users based on search term
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredUsers(availableUsers);
        } else {
            const term = searchTerm.toLowerCase();
            const filtered = availableUsers.filter(user =>
                user.fullName.toLowerCase().includes(term) ||
                user.email.toLowerCase().includes(term) ||
                (user.phone && user.phone.includes(term))
            );
            setFilteredUsers(filtered);
        }
    }, [searchTerm, availableUsers]);

    const fetchAvailableUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get(`/network/available-users/${leaderId}`);
            const data = response.data;
            setAvailableUsers(data);
            setFilteredUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignUser = async () => {
        if (!selectedUserId) {
            setError('Por favor selecciona un usuario');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            const response = await api.post('/network/assign', {
                userId: selectedUserId,
                leaderId: leaderId
            });

            const data = response.data;

            // Show success notification
            alert(`✓ ${data.message}`);

            // Notify parent component
            if (onUserAdded) {
                onUserAdded();
            }

            // Close modal
            handleClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setSearchTerm('');
        setSelectedUserId(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <UserPlus className="w-6 h-6 text-blue-600" />
                            Agregar Usuario a la Red
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Agregar a la red de: <span className="font-semibold">{leaderName}</span>
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={submitting}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email o teléfono..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={loading || submitting}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                            <span className="ml-3 text-gray-600">Cargando usuarios...</span>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">
                                {searchTerm ? 'No se encontraron usuarios con ese criterio' : 'No hay usuarios disponibles para agregar'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredUsers.map((user) => (
                                <div
                                    key={user.id}
                                    onClick={() => setSelectedUserId(user.id)}
                                    className={`
                                        p-4 rounded-lg border-2 cursor-pointer transition-all
                                        ${selectedUserId === user.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-800">{user.fullName}</h3>
                                            <p className="text-sm text-gray-600">{user.email}</p>
                                            {user.phone && (
                                                <p className="text-sm text-gray-500">{user.phone}</p>
                                            )}
                                            {(user.pastorId || user.liderDoceId || user.liderCelulaId) && (
                                                <div className="text-xs text-orange-600 mt-1">
                                                    <span className="font-medium">⚠ Reasignación:</span>
                                                    <div className="ml-4 mt-1 space-y-0.5">
                                                        {user.pastor && (
                                                            <div>Pastor: {user.pastor.fullName}</div>
                                                        )}
                                                        {user.liderDoce && (
                                                            <div>Líder Doce: {user.liderDoce.fullName}</div>
                                                        )}
                                                        {user.liderCelula && (
                                                            <div>Líder Célula: {user.liderCelula.fullName}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <span className={`
                                            px-3 py-1 text-xs font-medium rounded-full
                                            ${user.roles?.includes('ADMIN') ? 'bg-red-100 text-red-800' :
                                                user.roles?.includes('PASTOR') ? 'bg-green-100 text-green-800' :
                                                    user.roles?.includes('LIDER_DOCE') ? 'bg-purple-100 text-purple-800' :
                                                        user.roles?.includes('LIDER_CELULA') ? 'bg-blue-100 text-blue-800' :
                                                            'bg-gray-100 text-gray-800'}
                                        `}>
                                            {user.roles ? user.roles.join(', ').replace(/_/g, ' ') : 'Usuario'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50">
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={submitting}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAssignUser}
                            disabled={!selectedUserId || submitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Agregando...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" />
                                    Agregar Usuario
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddUserModal;
