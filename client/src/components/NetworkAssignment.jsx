import { useState, useEffect } from 'react';
import { Users, UserPlus, X, Check } from 'lucide-react';
import api from '../utils/api';

const NetworkAssignment = () => {
    const [users, setUsers] = useState([]);
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [assigningUser, setAssigningUser] = useState(null);
    const [selectedLeader, setSelectedLeader] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/users');

            const allUsers = res.data;
            const user = JSON.parse(localStorage.getItem('user'));

            // Filtrar basado en rol
            let filteredUsers = allUsers;
            // Incluir tanto LIDER_DOCE como LIDER_CELULA como líderes potenciales
            let filteredLeaders = allUsers.filter(u => u.roles?.includes('LIDER_DOCE') || u.roles?.includes('LIDER_CELULA'));

            if (user.roles?.includes('LIDER_DOCE')) {
                // Para LIDER_DOCE, mostrar solo su red
                const getUserNetworkIds = (userId) => {
                    const network = new Set([userId]);
                    const queue = [userId];

                    while (queue.length > 0) {
                        const currentId = queue.shift();
                        const userDisciples = allUsers.filter(u => u.leaderId === currentId);
                        userDisciples.forEach(d => {
                            if (!network.has(d.id)) {
                                network.add(d.id);
                                queue.push(d.id);
                            }
                        });
                    }
                    return Array.from(network);
                };

                const networkIds = getUserNetworkIds(user.id);
                filteredUsers = allUsers.filter(u => networkIds.includes(u.id));
                // Para LIDER_DOCE, mostrarse a sí mismos y sus discípulos LIDER_CELULA como líderes potenciales
                filteredLeaders = allUsers.filter(u =>
                    networkIds.includes(u.id) && (u.roles?.includes('LIDER_DOCE') || u.roles?.includes('LIDER_CELULA'))
                );
            }

            setLeaders(filteredLeaders);
            setUsers(filteredUsers);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignLeader = async (userId, leaderId) => {
        try {
            await api.post('/network/assign', {
                userId: userId,
                leaderId: leaderId ? parseInt(leaderId) : null
            });

            setSuccess('Líder asignado exitosamente');
            setAssigningUser(null);
            setSelectedLeader('');
            fetchUsers();

            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al asignar líder');
            setTimeout(() => setError(''), 5000);
        }
    };

    const getRoleLabel = (roles, singleRole) => {
        if (roles && Array.isArray(roles)) {
            return roles.join(', ').replace(/_/g, ' ');
        }
        const labels = {
            ADMIN: 'Super Admin',
            LIDER_DOCE: 'Líder de 12',
            LIDER_CELULA: 'Líder de Célula',
            DISCIPULO: 'Discípulo',
        };
        return labels[singleRole] || singleRole || '';
    };

    const usersWithoutLeader = users.filter(u =>
        !u.leaderId && (u.roles?.includes('LIDER_CELULA') || u.roles?.includes('DISCIPULO'))
    );

    const renderNetworkTree = () => {
        return leaders.filter(l => l.roles?.includes('LIDER_DOCE')).map(leader => (
            <div key={leader.id} className="mb-6 bg-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                    <Users className="text-blue-400" size={20} />
                    <span className="text-white font-semibold">{leader.fullName}</span>
                    <span className="text-xs text-gray-400">({getRoleLabel(leader.roles, leader.role)})</span>
                    {leader._count?.invitedGuests > 0 && (
                        <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded">
                            {leader._count.invitedGuests} invitado{leader._count.invitedGuests !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                {leader.disciples && leader.disciples.length > 0 ? (
                    <div className="ml-6 space-y-2">
                        {leader.disciples.map(disciple => (
                            <div key={disciple.id}>
                                <div className="flex items-center justify-between bg-gray-600 p-3 rounded">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-gray-400">└─</span>
                                        <span className="text-white">{disciple.fullName}</span>
                                        <span className="text-xs text-gray-400">({getRoleLabel(disciple.roles, disciple.role)})</span>
                                        {disciple._count?.invitedGuests > 0 && (
                                            <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded">
                                                {disciple._count.invitedGuests} invitado{disciple._count.invitedGuests !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                    {currentUser?.roles?.includes('ADMIN') && (
                                        <button
                                            onClick={() => handleAssignLeader(disciple.id, null)}
                                            className="text-red-400 hover:text-red-300 text-sm"
                                        >
                                            Remover
                                        </button>
                                    )}
                                </div>

                                {/* Mostrar sub-discípulos si LIDER_CELULA tiene discípulos */}
                                {disciple.roles?.includes('LIDER_CELULA') && disciple.disciples && disciple.disciples.length > 0 && (
                                    <div className="ml-12 mt-2 space-y-2">
                                        {disciple.disciples.map(subDisciple => (
                                            <div key={subDisciple.id} className="flex items-center justify-between bg-gray-500 p-2 rounded">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-gray-400 text-sm">└─</span>
                                                    <span className="text-white text-sm">{subDisciple.fullName}</span>
                                                    <span className="text-xs text-gray-400">({getRoleLabel(subDisciple.roles, subDisciple.role)})</span>
                                                    {subDisciple._count?.invitedGuests > 0 && (
                                                        <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded">
                                                            {subDisciple._count.invitedGuests} invitado{subDisciple._count.invitedGuests !== 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                                {currentUser?.roles?.includes('ADMIN') && (
                                                    <button
                                                        onClick={() => handleAssignLeader(subDisciple.id, null)}
                                                        className="text-red-400 hover:text-red-300 text-xs"
                                                    >
                                                        Remover
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="ml-6 text-gray-400 text-sm italic">Sin discípulos asignados</p>
                )}
            </div>
        ));
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Red de Discipulado</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Asigna líderes de célula y Discípulos a los líderes de 12
                </p>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-900/20 border border-green-500 text-green-400 px-4 py-3 rounded">
                    {success}
                </div>
            )}

            {/* Usuarios sin líder - para ADMIN y LIDER_DOCE */}
            {(currentUser?.roles?.includes('ADMIN') || currentUser?.roles?.includes('LIDER_DOCE')) && (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-bold text-white mb-4">Usuarios sin Líder Asignado</h2>

                    {loading ? (
                        <p className="text-gray-400">Cargando...</p>
                    ) : usersWithoutLeader.length === 0 ? (
                        <p className="text-gray-400 italic">Todos los usuarios tienen líder asignado</p>
                    ) : (
                        <div className="space-y-3">
                            {usersWithoutLeader.map(user => (
                                <div key={user.id} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                                    <div>
                                        <p className="text-white font-medium">{user.fullName}</p>
                                        <p className="text-sm text-gray-400">{getRoleLabel(user.roles, user.role)}</p>
                                    </div>

                                    {assigningUser?.id === user.id ? (
                                        <div className="flex items-center space-x-2">
                                            <select
                                                value={selectedLeader}
                                                onChange={(e) => setSelectedLeader(e.target.value)}
                                                className="px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="">Seleccionar líder...</option>
                                                {leaders.map(leader => (
                                                    <option key={leader.id} value={leader.id}>
                                                        {leader.fullName}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handleAssignLeader(user.id, selectedLeader)}
                                                disabled={!selectedLeader}
                                                className="p-2 text-green-400 hover:text-green-300 disabled:opacity-50"
                                                title="Confirmar"
                                            >
                                                <Check size={20} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setAssigningUser(null);
                                                    setSelectedLeader('');
                                                }}
                                                className="p-2 text-gray-400 hover:text-gray-300"
                                                title="Cancelar"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setAssigningUser(user)}
                                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                                        >
                                            <UserPlus size={18} />
                                            <span>Asignar Líder</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Árbol de red */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">Estructura de Red</h2>
                {loading ? (
                    <p className="text-gray-400">Cargando...</p>
                ) : (
                    renderNetworkTree()
                )}
            </div>
        </div>
    );
};

export default NetworkAssignment;
