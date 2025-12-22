import { useState, useEffect } from 'react';
import { X, Save, Loader, Plus, Trash2, Edit2, Search } from 'lucide-react';
import api from '../utils/api';

const UserManagementModal = ({ isOpen, onClose }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        role: 'Miembro',
        sex: 'HOMBRE',
        phone: '',
        address: '',
        city: '',
        liderDoceId: '',
        assignedLeaderId: ''
    });

    const lideresDoce = users.filter(u => u.role === 'LIDER_DOCE');
    const pastores = users.filter(u => u.role === 'PASTOR');
    const lideresCelula = users.filter(u => u.role === 'LIDER_CELULA');

    const getAssignableRoles = () => {
        if (!currentUser) return [];
        if (currentUser.role === 'SUPER_ADMIN') return ['Miembro', 'LIDER_CELULA', 'LIDER_DOCE', 'PASTOR', 'SUPER_ADMIN'];
        if (currentUser.role === 'PASTOR') return ['Miembro', 'LIDER_CELULA', 'LIDER_DOCE', 'PASTOR'];
        if (currentUser.role === 'LIDER_DOCE') return ['Miembro', 'LIDER_CELULA'];
        if (currentUser.role === 'LIDER_CELULA') return ['Miembro'];
        return [];
    };

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users');
            setUsers(res.data.users);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('token');
            const payload = { ...formData };

            // Map assignedLeaderId to correct field
            if (payload.assignedLeaderId) {
                if (payload.role === 'LIDER_DOCE') {
                    payload.pastorId = payload.assignedLeaderId;
                } else if (payload.role === 'LIDER_CELULA') {
                    payload.liderDoceId = payload.assignedLeaderId;
                } else if (payload.role === 'Miembro') {
                    // Check if selected leader is Lider Doce or Lider Celula
                    const leader = users.find(u => u.id === parseInt(payload.assignedLeaderId));
                    if (leader?.role === 'LIDER_DOCE') {
                        payload.liderDoceId = payload.assignedLeaderId;
                    } else {
                        payload.liderCelulaId = payload.assignedLeaderId;
                    }
                }
            }
            delete payload.assignedLeaderId;
            // Clean empty strings
            Object.keys(payload).forEach(key => payload[key] === '' && delete payload[key]);

            await api.post('/users', payload);

            setSuccess('Usuario creado exitosamente');
            setShowCreateForm(false);
            setShowCreateForm(false);
            setFormData({ fullName: '', email: '', password: '', role: 'Miembro', sex: 'HOMBRE', phone: '', address: '', city: '', assignedLeaderId: '' });
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al crear usuario');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async (userId, updates) => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await api.put(`/users/${userId}`, updates);

            // Update leader if assigned
            if (updates.assignedLeaderId) {
                await api.post(`/users/assign-leader/${userId}`, { leaderId: updates.assignedLeaderId });
            }

            setSuccess('Usuario actualizado exitosamente');
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al actualizar usuario');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await api.delete(`/users/${userId}`);

            setSuccess('Usuario eliminado exitosamente');
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al eliminar usuario');
        } finally {
            setLoading(false);
        }
    };

    // Filter users by network for LIDER_DOCE
    const getUserNetworkIds = (userId, allUsers) => {
        const network = new Set([userId]);
        const queue = [userId];
        const visited = new Set([userId]);

        while (queue.length > 0) {
            const currentId = queue.shift();

            // Find disciples who report to this leader via ANY field
            const userDisciples = allUsers.filter(u =>
                u.leaderId === currentId ||
                u.liderDoceId === currentId ||
                u.pastorId === currentId ||
                u.liderCelulaId === currentId
            );

            userDisciples.forEach(d => {
                if (!visited.has(d.id)) {
                    visited.add(d.id);
                    network.add(d.id);
                    queue.push(d.id);
                }
            });
        }
        return Array.from(network);
    };

    let displayUsers = users;
    // Backend handles filtering for LIDER_DOCE, LIDER_CELULA, and PASTOR now.
    // We rely on the API response to be correct.

    // Optional: Client-side enforcing for Pastor just in case
    if (currentUser?.role === 'PASTOR') {
        displayUsers = users.filter(u => u.role === 'LIDER_DOCE' || u.id === currentUser.id);
    }

    const filteredUsers = displayUsers.filter(
        (user) =>
            user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Gestionar Usuarios</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-900/20 border border-green-500 text-green-400 px-4 py-3 rounded mb-4">
                            {success}
                        </div>
                    )}

                    {/* Search and Create Button */}


                    {/* Create User Button - Hidden for Members */}
                    {currentUser?.role !== 'Miembro' && (
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar usuarios..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <button
                                onClick={() => setShowCreateForm(!showCreateForm)}
                                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                <Plus size={20} />
                                <span>Crear Usuario</span>
                            </button>
                        </div>
                    )}

                    {/* Create User Form */}
                    {showCreateForm && (
                        <form onSubmit={handleCreateUser} className="bg-gray-700 p-4 rounded-lg mb-6 space-y-4">
                            <h3 className="text-lg font-semibold text-white">Nuevo Usuario</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Nombre Completo
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Correo Electrónico
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value, assignedLeaderId: '' })}
                                        className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    >
                                        {getAssignableRoles().map(role => (
                                            <option key={role} value={role}>{role.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Sexo</label>
                                    <select
                                        value={formData.sex}
                                        onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="HOMBRE">Hombre</option>
                                        <option value="MUJER">Mujer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Teléfono</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Dirección</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Ciudad</label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                {/* Dynamic Leader Assignment */}
                                {formData.role !== 'PASTOR' && formData.role !== 'SUPER_ADMIN' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            {formData.role === 'LIDER_DOCE' ? 'Asignar a Pastor' :
                                                formData.role === 'Miembro' ? 'Asignar a Líder Célula' : 'Asignar a Líder 12'}
                                        </label>
                                        <select
                                            value={formData.assignedLeaderId}
                                            onChange={(e) => setFormData({ ...formData, assignedLeaderId: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="">-- Sin Asignar --</option>
                                            {(() => {
                                                let options = [];
                                                if (formData.role === 'LIDER_DOCE') options = pastores;
                                                else if (formData.role === 'LIDER_CELULA') options = lideresDoce;
                                                else if (formData.role === 'Miembro') {
                                                    // Default to Lider Celula, fallback to Lider Doce
                                                    options = lideresCelula.length > 0 ? lideresCelula : lideresDoce;
                                                }
                                                return options.map(leader => (
                                                    <option key={leader.id} value={leader.id}>
                                                        {leader.fullName}
                                                    </option>
                                                ));
                                            })()}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader size={20} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Save size={20} />
                                            <span>Crear</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setFormData({ fullName: '', email: '', password: '', role: 'Miembro', sex: 'HOMBRE', phone: '', address: '', city: '', liderDoceId: '' });
                                    }}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Users Table */}
                    <div className="bg-gray-700 rounded-lg overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-600">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">Nombre</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">Email</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">Teléfono</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">Dirección</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">Ciudad</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">Sexo</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">Rol</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">Líder Asignado</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-200">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-600">
                                {loading && !users.length ? (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-8 text-center text-gray-400">
                                            <Loader size={24} className="animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-8 text-center text-gray-400">
                                            No se encontraron usuarios
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-600/50">
                                            <td className="px-4 py-3">
                                                {editingUser?.id === user.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingUser.fullName}
                                                        onChange={(e) =>
                                                            setEditingUser({ ...editingUser, fullName: e.target.value })
                                                        }
                                                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                                                    />
                                                ) : (
                                                    <span className="text-white text-sm">{user.fullName}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingUser?.id === user.id ? (
                                                    <input
                                                        type="email"
                                                        value={editingUser.email}
                                                        onChange={(e) =>
                                                            setEditingUser({ ...editingUser, email: e.target.value })
                                                        }
                                                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                                                    />
                                                ) : (
                                                    <span className="text-gray-300 text-sm">{user.email}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingUser?.id === user.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingUser.phone}
                                                        onChange={(e) =>
                                                            setEditingUser({ ...editingUser, phone: e.target.value })
                                                        }
                                                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                                                    />
                                                ) : (
                                                    <span className="text-gray-300 text-sm">{user.phone}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingUser?.id === user.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingUser.address}
                                                        onChange={(e) =>
                                                            setEditingUser({ ...editingUser, address: e.target.value })
                                                        }
                                                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                                                    />
                                                ) : (
                                                    <span className="text-gray-300 text-sm truncate max-w-[150px] inline-block" title={user.address}>{user.address}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingUser?.id === user.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingUser.city}
                                                        onChange={(e) =>
                                                            setEditingUser({ ...editingUser, city: e.target.value })
                                                        }
                                                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                                                    />
                                                ) : (
                                                    <span className="text-gray-300 text-sm">{user.city}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingUser?.id === user.id ? (
                                                    <select
                                                        value={editingUser.sex}
                                                        onChange={(e) =>
                                                            setEditingUser({ ...editingUser, sex: e.target.value })
                                                        }
                                                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                                                    >
                                                        <option value="HOMBRE">Hombre</option>
                                                        <option value="MUJER">Mujer</option>
                                                    </select>
                                                ) : (
                                                    <span className="text-gray-300 text-sm">{user.sex}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingUser?.id === user.id ? (
                                                    <select
                                                        value={editingUser.role}
                                                        onChange={(e) =>
                                                            setEditingUser({ ...editingUser, role: e.target.value })
                                                        }
                                                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                                                    >
                                                        {getAssignableRoles().map(role => (
                                                            <option key={role} value={role}>{role.replace('_', ' ')}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="inline-block px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs">
                                                        {user.role.replace('_', ' ')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingUser?.id === user.id && (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'PASTOR') ? (
                                                    <select
                                                        value={editingUser.assignedLeaderId || ''}
                                                        onChange={(e) =>
                                                            setEditingUser({ ...editingUser, assignedLeaderId: e.target.value })
                                                        }
                                                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                                                    >
                                                        <option value="">-- Sin Asignar --</option>
                                                        {(() => {
                                                            let options = [];
                                                            // Determine valid leader options based on user's role (not current user)
                                                            if (editingUser.role === 'LIDER_DOCE') options = pastores;
                                                            else if (editingUser.role === 'LIDER_CELULA') options = lideresDoce;
                                                            else if (editingUser.role === 'Miembro') {
                                                                options = lideresCelula.length > 0 ? lideresCelula : lideresDoce;
                                                            }
                                                            // If editing a Pastor, maybe show nothing or generic?
                                                            return options.map(leader => (
                                                                <option key={leader.id} value={leader.id}>
                                                                    {leader.fullName}
                                                                </option>
                                                            ));
                                                        })()}
                                                    </select>
                                                ) : (
                                                    <span className="text-gray-300 text-sm">
                                                        {user.leader?.fullName || '-'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end space-x-2">
                                                    {editingUser?.id === user.id ? (
                                                        <>
                                                            <button
                                                                onClick={() =>
                                                                    handleUpdateUser(user.id, {
                                                                        fullName: editingUser.fullName,
                                                                        email: editingUser.email,
                                                                        role: editingUser.role,
                                                                        phone: editingUser.phone || '',
                                                                        address: editingUser.address || '',
                                                                        city: editingUser.city || '',
                                                                        sex: editingUser.sex || '',
                                                                        assignedLeaderId: editingUser.assignedLeaderId
                                                                    })
                                                                }
                                                                className="p-1 text-green-400 hover:text-green-300"
                                                                title="Guardar"
                                                            >
                                                                <Save size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingUser(null)}
                                                                className="p-1 text-gray-400 hover:text-gray-300"
                                                                title="Cancelar"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => setEditingUser({ ...user, assignedLeaderId: user.leaderId })}
                                                                className="p-1 text-blue-400 hover:text-blue-300"
                                                                title="Editar"
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                            {currentUser?.role !== 'LIDER_DOCE' && (
                                                                <button
                                                                    onClick={() => handleDeleteUser(user.id)}
                                                                    className="p-1 text-red-400 hover:text-red-300"
                                                                    title="Eliminar"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            )}
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
                </div>
            </div>
        </div>
    );
};

export default UserManagementModal;
