import { useState, useEffect } from 'react';
import { X, Save, Loader, Plus, Trash2, Edit2, Search } from 'lucide-react';
import axios from 'axios';

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
        role: 'MIEMBRO',
        sex: 'HOMBRE',
        phone: '',
        address: '',
        city: '',
        liderDoceId: ''
    });

    const lideresDoce = users.filter(u => u.role === 'LIDER_DOCE');

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
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/users', {
                headers: { Authorization: `Bearer ${token}` },
            });
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
            await axios.post('http://localhost:5000/api/users', formData, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setSuccess('Usuario creado exitosamente');
            setShowCreateForm(false);
            setFormData({ fullName: '', email: '', password: '', role: 'MIEMBRO', sex: 'HOMBRE', phone: '', address: '', city: '', liderDoceId: '' });
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
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/users/${userId}`, updates, {
                headers: { Authorization: `Bearer ${token}` },
            });

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
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

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
    if (currentUser?.role === 'LIDER_DOCE') {
        const networkIds = getUserNetworkIds(currentUser.id, users);
        displayUsers = users.filter(u => networkIds.includes(u.id));
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
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Rol
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="MIEMBRO">Miembro</option>
                                        <option value="LIDER_CELULA">Líder de Célula</option>
                                        <option value="LIDER_DOCE">Líder de Los Doce</option>
                                        <option value="PASTOR">Pastor</option>
                                        <option value="SUPER_ADMIN">Super Admin</option>
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

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Asignar a Líder 12</label>
                                    <select
                                        value={formData.liderDoceId}
                                        onChange={(e) => setFormData({ ...formData, liderDoceId: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="">-- Sin Asignar --</option>
                                        {lideresDoce.map(leader => (
                                            <option key={leader.id} value={leader.id}>
                                                {leader.fullName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
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
                                        setFormData({ fullName: '', email: '', password: '', role: 'MIEMBRO', sex: 'HOMBRE', phone: '', address: '', city: '', liderDoceId: '' });
                                    }}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Users Table */}
                    <div className="bg-gray-700 rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-600">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">Nombre</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">Email</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200">Rol</th>
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
                                                    <select
                                                        value={editingUser.role}
                                                        onChange={(e) =>
                                                            setEditingUser({ ...editingUser, role: e.target.value })
                                                        }
                                                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                                                    >
                                                        <option value="MIEMBRO">Miembro</option>
                                                        <option value="LIDER_CELULA">Líder de Célula</option>
                                                        <option value="LIDER_DOCE">Líder de Los Doce</option>
                                                        <option value="PASTOR">Pastor</option>
                                                        <option value="SUPER_ADMIN">Super Admin</option>
                                                    </select>
                                                ) : (
                                                    <span className="inline-block px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs">
                                                        {user.role.replace('_', ' ')}
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
                                                                onClick={() => setEditingUser(user)}
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
