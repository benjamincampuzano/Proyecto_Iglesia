import { useState, useEffect } from 'react';
import api from '../utils/api';
import {
    Users, UserPlus, Search, Edit, Trash2, Save, X, Loader,
    Filter, Mail, Phone, MapPin, User as UserIcon, Shield
} from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
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
        assignedLeaderId: ''
    });

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/users');
            setUsers(response.data.users);
        } catch (err) {
            setError('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const payload = { ...formData };
            if (payload.assignedLeaderId) {
                if (payload.role === 'LIDER_DOCE') payload.pastorId = payload.assignedLeaderId;
                else if (payload.role === 'LIDER_CELULA') payload.liderDoceId = payload.assignedLeaderId;
                else if (payload.role === 'Miembro') {
                    const leader = users.find(u => u.id === parseInt(payload.assignedLeaderId));
                    if (leader?.role === 'LIDER_DOCE') payload.liderDoceId = payload.assignedLeaderId;
                    else payload.liderCelulaId = payload.assignedLeaderId;
                }
            }
            delete payload.assignedLeaderId;
            await api.post('/users', payload);
            setSuccess('Usuario creado exitosamente');
            setShowCreateForm(false);
            setFormData({ fullName: '', email: '', password: '', role: 'Miembro', sex: 'HOMBRE', phone: '', address: '', city: '', assignedLeaderId: '' });
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al crear usuario');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateUser = async (userId) => {
        if (!editingUser) return;
        setSubmitting(true);
        setError('');
        try {
            const payload = {
                fullName: editingUser.fullName,
                email: editingUser.email,
                role: editingUser.role,
                sex: editingUser.sex,
                phone: editingUser.phone,
                address: editingUser.address,
                city: editingUser.city
            };
            await api.put(`/users/${userId}`, payload);
            if (editingUser.assignedLeaderId && editingUser.assignedLeaderId !== editingUser.leaderId) {
                await api.post(`/users/assign-leader/${userId}`, { leaderId: editingUser.assignedLeaderId });
            }
            setSuccess('Usuario actualizado');
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al actualizar');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('¿Eliminar este usuario?')) return;
        try {
            await api.delete(`/users/${userId}`);
            setSuccess('Usuario eliminado');
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al eliminar');
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === '' || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const getAssignableRoles = () => {
        if (!currentUser) return [];
        if (currentUser.role === 'SUPER_ADMIN') return ['Miembro', 'LIDER_CELULA', 'LIDER_DOCE', 'PASTOR', 'SUPER_ADMIN', 'PROFESOR', 'AUXILIAR'];
        if (currentUser.role === 'PASTOR') return ['Miembro', 'LIDER_CELULA', 'LIDER_DOCE', 'PASTOR'];
        return ['Miembro', 'LIDER_CELULA'];
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Users className="text-blue-600" size={32} />
                        Gestión de Usuarios
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Administra perfiles, roles y jerarquía de la iglesia.</p>
                </div>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                >
                    <UserPlus size={20} />
                    <span>Nuevo Usuario</span>
                </button>
            </div>

            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm">{error}</div>}
            {success && <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-sm">{success}</div>}

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-48 relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="">Todos los roles</option>
                        {['SUPER_ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'Miembro', 'PROFESOR', 'AUXILIAR'].map(r => (
                            <option key={r} value={r}>{r.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Contacto</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Ubicación</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Rol</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-6 py-8 bg-gray-50/50 dark:bg-gray-800/50"></td>
                                    </tr>
                                ))
                            ) : filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold">
                                                {user.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">{user.fullName}</p>
                                                <p className="text-xs text-gray-500">{user.sex === 'HOMBRE' ? 'Hombre' : 'Mujer'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                <Mail size={14} /> {user.email}
                                            </div>
                                            {user.phone && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                    <Phone size={14} /> {user.phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                <MapPin size={14} className="flex-shrink-0" />
                                                <span className="truncate max-w-[150px]" title={user.address}>{user.address || 'Sin dirección'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{user.city || 'Desconocida'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`}>
                                            {user.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setEditingUser({ ...user, assignedLeaderId: user.leaderId })}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showCreateForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold dark:text-white">Crear Nuevo Usuario</h2>
                            <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Nombre Completo</label>
                                    <input required type="text" className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Email</label>
                                    <input required type="email" className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Password</label>
                                    <input required type="password" placeholder="Mínimo 6 caracteres" className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Rol</label>
                                    <select className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                        {getAssignableRoles().map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Teléfono</label>
                                    <input type="text" className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Dirección</label>
                                    <input type="text" className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Ciudad</label>
                                    <input type="text" className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                                <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                                <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                    {submitting ? 'Creando...' : 'Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold dark:text-white">Editar: {editingUser.fullName}</h2>
                            <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Nombre</label>
                                <input type="text" className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700" value={editingUser.fullName} onChange={e => setEditingUser({ ...editingUser, fullName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Email</label>
                                <input type="email" className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700" value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Rol</label>
                                <select className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700" value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}>
                                    {getAssignableRoles().map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Teléfono</label>
                                <input type="text" className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700" value={editingUser.phone || ''} onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Dirección</label>
                                <input type="text" className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700" value={editingUser.address || ''} onChange={e => setEditingUser({ ...editingUser, address: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Ciudad</label>
                                <input type="text" className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700" value={editingUser.city || ''} onChange={e => setEditingUser({ ...editingUser, city: e.target.value })} />
                            </div>
                        </div>
                        <div className="p-6 flex justify-end gap-3 border-t dark:border-gray-700">
                            <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2">Cancelar</button>
                            <button disabled={submitting} onClick={() => handleUpdateUser(editingUser.id)} className="bg-blue-600 text-white px-6 py-2 rounded-lg">
                                {submitting ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
