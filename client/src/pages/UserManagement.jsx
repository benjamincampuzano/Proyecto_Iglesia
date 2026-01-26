import useUserManagement from '../hooks/useUserManagement';
import {
    Users, UserPlus, Search, Edit, Trash2, Loader,
    Filter, Mail, Phone, MapPin
} from 'lucide-react';
import DataTable from '../components/DataTable';
import ActionModal from '../components/ActionModal';

const UserManagement = () => {
    const {
        loading,
        error,
        success,
        searchTerm,
        setSearchTerm,
        roleFilter,
        setRoleFilter,
        sexFilter,
        setSexFilter,
        liderDoceFilter,
        setLiderDoceFilter,
        editingUser,
        setEditingUser,
        showCreateForm,
        setShowCreateForm,
        submitting,
        formData,
        setFormData,
        pastores,
        lideresDoce,
        lideresCelula,
        filteredUsers,
        handleCreateUser,
        handleUpdateUser,
        handleDeleteUser,
        getAssignableRoles,
    } = useUserManagement();

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

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-row flex-wrap items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative min-w-[200px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-gray-900 dark:text-white"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="">Todos los roles</option>
                        {['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'].map(r => (
                            <option key={r} value={r}>{r.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>
                <div className="relative min-w-[150px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-gray-900 dark:text-white"
                        value={sexFilter}
                        onChange={(e) => setSexFilter(e.target.value)}
                    >
                        <option value="">Todos los sexos</option>
                        <option value="HOMBRE">Hombre</option>
                        <option value="MUJER">Mujer</option>
                    </select>
                </div>
                <div className="relative min-w-[200px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-gray-900 dark:text-white"
                        value={liderDoceFilter}
                        onChange={(e) => setLiderDoceFilter(e.target.value)}
                    >
                        <option value="">Todos los Líderes 12</option>
                        {lideresDoce.map(l => (
                            <option key={l.id} value={l.id}>{l.fullName}</option>
                        ))}
                    </select>
                </div>
            </div>

            <DataTable
                columns={[
                    {
                        key: 'user',
                        header: 'Usuario',
                        headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase',
                        cellClassName: 'px-6 py-4',
                        render: (user) => (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold">
                                    {user.fullName.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">{user.fullName}</p>
                                    <p className="text-xs text-gray-500">{user.sex === 'HOMBRE' ? 'Hombre' : 'Mujer'}</p>
                                </div>
                            </div>
                        )
                    },
                    {
                        key: 'contact',
                        header: 'Contacto',
                        headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase',
                        cellClassName: 'px-6 py-4',
                        render: (user) => (
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
                        )
                    },
                    {
                        key: 'location',
                        header: 'Ubicación',
                        headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase',
                        cellClassName: 'px-6 py-4',
                        render: (user) => (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <MapPin size={14} className="flex-shrink-0" />
                                    <span className="truncate max-w-[150px]" title={user.address}>{user.address || 'Sin dirección'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>{user.city || 'Desconocida'}</span>
                                </div>
                            </div>
                        )
                    },
                    {
                        key: 'roles',
                        header: 'Rol',
                        headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase',
                        cellClassName: 'px-6 py-4',
                        render: (user) => (
                            <div className="flex flex-wrap gap-1">
                                {user.roles?.map(role => (
                                    <span key={role} className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                        {role.replace('_', ' ')}
                                    </span>
                                ))}
                            </div>
                        )
                    },
                    {
                        key: 'actions',
                        header: 'Acciones',
                        headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right',
                        cellClassName: 'px-6 py-4 text-right',
                        render: (user) => (
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setEditingUser({
                                        ...user,
                                        pastorId: user.pastorId || '',
                                        liderDoceId: user.liderDoceId || '',
                                        liderCelulaId: user.liderCelulaId || '',
                                        role: user.roles?.[0] || 'DISCIPULO'
                                    })}
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
                        )
                    }
                ]}
                data={filteredUsers}
                loading={loading}
                skeletonRowCount={3}
                emptyMessage="No hay datos para mostrar."
            />

            <ActionModal
                isOpen={showCreateForm}
                title="Crear Nuevo Usuario"
                onClose={() => setShowCreateForm(false)}
                containerClassName="max-w-2xl md:max-w-4xl"
            >
                <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Tipo de Documento</label>
                                    <select
                                        className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        value={formData.documentType}
                                        onChange={e => setFormData({ ...formData, documentType: e.target.value })}
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="RC">RC</option>
                                        <option value="TI">TI</option>
                                        <option value="CC">CC</option>
                                        <option value="CE">CE</option>
                                        <option value="PP">PP</option>
                                        <option value="PEP">PEP</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Número de Documento</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        value={formData.documentNumber || ''}
                                        onChange={e => setFormData({ ...formData, documentNumber: e.target.value })}
                                        placeholder="12345678"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Nombre Completo</label>
                                    <input required type="text" className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Fecha de Nacimiento</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        value={formData.birthDate || ''}
                                        onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
                                    <input required type="email" className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Password</label>
                                    <input required type="password" placeholder="Mínimo 6 caracteres" className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Rol</label>
                                    <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value, pastorId: '', liderDoceId: '', liderCelulaId: '' })}>
                                        {getAssignableRoles().map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Sexo</label>
                                    <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value })}>
                                        <option value="HOMBRE">Hombre</option>
                                        <option value="MUJER">Mujer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Teléfono</label>
                                    <input type="text" className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Dirección</label>
                                    <input type="text" className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Ciudad</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        value={formData.city || ''}
                                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                                        placeholder="Ciudad"
                                    />
                                </div>

                                {/* Dynamic Leader Selection */}
                                {formData.role === 'PASTOR' && (
                                    <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm">
                                        ℹ️ El rol PASTOR es líder de sí mismo por defecto.
                                    </div>
                                )}

                                {formData.role === 'LIDER_DOCE' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Asignar a Pastor</label>
                                        <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.pastorId} onChange={e => setFormData({ ...formData, pastorId: e.target.value })}>
                                            <option value="">-- Sin Asignar --</option>
                                            {pastores.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                        </select>
                                    </div>
                                )}

                                {formData.role === 'LIDER_CELULA' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Asignar a Líder 12</label>
                                            <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.liderDoceId} onChange={e => setFormData({ ...formData, liderDoceId: e.target.value })}>
                                                <option value="">-- Sin Asignar --</option>
                                                {lideresDoce.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Asignar a Pastor (Opcional)</label>
                                            <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.pastorId} onChange={e => setFormData({ ...formData, pastorId: e.target.value })}>
                                                <option value="">-- Sin Asignar --</option>
                                                {pastores.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}

                                {formData.role === 'DISCIPULO' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Líder 12</label>
                                            <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.liderDoceId} onChange={e => setFormData({ ...formData, liderDoceId: e.target.value, liderCelulaId: '' })}>
                                                <option value="">-- Sin Asignar --</option>
                                                {lideresDoce.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Líder Célula</label>
                                            <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.liderCelulaId} onChange={e => setFormData({ ...formData, liderCelulaId: e.target.value })}>
                                                <option value="">-- Sin Asignar --</option>
                                                {lideresCelula
                                                    .filter(lc => !formData.liderDoceId || lc.liderDoceId === parseInt(formData.liderDoceId))
                                                    .map(lc => <option key={lc.id} value={lc.id}>{lc.fullName}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">Cancelar</button>
                                <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/30">
                                    {submitting ? (
                                        <div className="flex items-center gap-2">
                                            <Loader className="animate-spin" size={18} />
                                            <span>Creando...</span>
                                        </div>
                                    ) : 'Crear Usuario'}
                                </button>
                            </div>
                </form>
            </ActionModal>

            {editingUser && (
                <ActionModal
                    isOpen={!!editingUser}
                    title={`Editar: ${editingUser.fullName}`}
                    onClose={() => setEditingUser(null)}
                    containerClassName="max-w-2xl md:max-w-4xl"
                >
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Nombre</label>
                                <input type="text" className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={editingUser.fullName} onChange={e => setEditingUser({ ...editingUser, fullName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
                                <input type="email" className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Rol</label>
                                <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}>
                                    {getAssignableRoles().map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Sexo</label>
                                <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={editingUser.sex} onChange={e => setEditingUser({ ...editingUser, sex: e.target.value })}>
                                    <option value="HOMBRE">Hombre</option>
                                    <option value="MUJER">Mujer</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Teléfono</label>
                                <input type="text" className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={editingUser.phone || ''} onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Dirección</label>
                                <input type="text" className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={editingUser.address || ''} onChange={e => setEditingUser({ ...editingUser, address: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Ciudad</label>
                                <input type="text" className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={editingUser.city || ''} onChange={e => setEditingUser({ ...editingUser, city: e.target.value })} />
                            </div>

                            {/* Dynamic Leader Selection in Edit */}
                            {editingUser.role === 'LIDER_DOCE' && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Asignar a Pastor</label>
                                    <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={editingUser.pastorId} onChange={e => setEditingUser({ ...editingUser, pastorId: e.target.value })}>
                                        <option value="">-- Sin Asignar --</option>
                                        {pastores.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                    </select>
                                </div>
                            )}

                            {editingUser.role === 'LIDER_CELULA' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Asignar a Líder 12</label>
                                        <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={editingUser.liderDoceId} onChange={e => setEditingUser({ ...editingUser, liderDoceId: e.target.value })}>
                                            <option value="">-- Sin Asignar --</option>
                                            {lideresDoce.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Asignar a Pastor (Opcional)</label>
                                        <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={editingUser.pastorId} onChange={e => setEditingUser({ ...editingUser, pastorId: e.target.value })}>
                                            <option value="">-- Sin Asignar --</option>
                                            {pastores.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}

                            {editingUser.role === 'DISCIPULO' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Líder 12</label>
                                        <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={editingUser.liderDoceId} onChange={e => setEditingUser({ ...editingUser, liderDoceId: e.target.value, liderCelulaId: '' })}>
                                            <option value="">-- Sin Asignar --</option>
                                            {lideresDoce.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Líder Célula</label>
                                        <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={editingUser.liderCelulaId} onChange={e => setEditingUser({ ...editingUser, liderCelulaId: e.target.value })}>
                                            <option value="">-- Sin Asignar --</option>
                                            {lideresCelula
                                                .filter(lc => !editingUser.liderDoceId || lc.liderDoceId === parseInt(editingUser.liderDoceId))
                                                .map(lc => <option key={lc.id} value={lc.id}>{lc.fullName}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                <div className="p-6 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                            <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">Cancelar</button>
                            <button disabled={submitting} onClick={() => handleUpdateUser(editingUser.id)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                                {submitting ? (
                                    <div className="flex items-center gap-2">
                                        <Loader className="animate-spin" size={18} />
                                        <span>Guardando...</span>
                                    </div>
                                ) : 'Guardar Cambios'}
                            </button>
                        </div>
                </ActionModal>
            )}
        </div>
    );
};

export default UserManagement;
