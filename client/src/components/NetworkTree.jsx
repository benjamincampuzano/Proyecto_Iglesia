import { useState } from 'react';
import { Users, UserCheck, UserPlus, UserMinus, ChevronDown, ChevronRight } from 'lucide-react';
import AddUserModal from './AddUserModal';
import RemoveUserDialog from './RemoveUserDialog';

const NetworkTree = ({ network, currentUser, onNetworkChange }) => {
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
    const [selectedLeader, setSelectedLeader] = useState(null);
    const [selectedUserToRemove, setSelectedUserToRemove] = useState(null);

    if (!network) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">Selecciona un líder para ver su red de discipulado</p>
            </div>
        );
    }

    const handleAddUser = (leader) => {
        setSelectedLeader(leader);
        setAddModalOpen(true);
    };

    const handleRemoveUser = (user) => {
        setSelectedUserToRemove(user);
        setRemoveDialogOpen(true);
    };

    const handleNetworkUpdated = () => {
        if (onNetworkChange) {
            onNetworkChange();
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
                    Red de Discipulado: {network.fullName}
                </h2>

                {/* Leadership Context for the root user */}
                {(network.pastor || network.liderDoce || network.liderCelula) && (
                    <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 ml-1">
                            Jerarquía de Liderazgo
                        </h4>
                        <div className="flex flex-wrap gap-4">
                            {network.pastor && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase leading-none mb-0.5">Pastor</p>
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{network.pastor.fullName}</p>
                                    </div>
                                </div>
                            )}
                            {network.liderDoce && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase leading-none mb-0.5">Líder Los Doce</p>
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{network.liderDoce.fullName}</p>
                                    </div>
                                </div>
                            )}
                            {network.liderCelula && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase leading-none mb-0.5">Líder Célula</p>
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{network.liderCelula.fullName}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <NetworkNode
                    node={network}
                    level={0}
                    currentUser={currentUser}
                    onAddUser={handleAddUser}
                    onRemoveUser={handleRemoveUser}
                />
            </div>

            {/* Add User Modal */}
            <AddUserModal
                isOpen={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                leaderId={selectedLeader?.id}
                leaderName={selectedLeader?.fullName}
                onUserAdded={handleNetworkUpdated}
            />

            {/* Remove User Dialog */}
            <RemoveUserDialog
                isOpen={removeDialogOpen}
                onClose={() => setRemoveDialogOpen(false)}
                user={selectedUserToRemove}
                onUserRemoved={handleNetworkUpdated}
            />
        </>
    );
};

const NetworkNode = ({ node, level, currentUser, onAddUser, onRemoveUser }) => {
    const [isExpanded, setIsExpanded] = useState(level < 2);

    const hasChildren = node.disciples?.length > 0 ||
        node.assignedGuests?.length > 0 ||
        node.invitedGuests?.length > 0;

    const totalGuests = (node.assignedGuests?.length || 0) + (node.invitedGuests?.length || 0);

    /**
     * Determine if the current user can add users to this node
     * SUPER_ADMIN: Can manage all nodes
     * LIDER_DOCE: Can add to their own node and to LIDER_CELULA in their network
     * LIDER_CELULA: Can add to their own node
     * DISCIPULO: Cannot manage
     */
    const canAddToNode = () => {
        if (!currentUser) return false;

        const userRole = currentUser.role;

        // SUPER_ADMIN can manage all nodes
        if (userRole === 'SUPER_ADMIN') return true;

        // LIDER_DOCE can add to their own node or to LIDER_CELULA in their network
        if (userRole === 'LIDER_DOCE') {
            // Can add to themselves
            if (node.id === currentUser.id) return true;

            // Can add to LIDER_CELULA who are their direct disciples
            if (node.role === 'LIDER_CELULA' && level === 1) {
                return true;
            }
        }

        // LIDER_CELULA can only add to their own node
        if (userRole === 'LIDER_CELULA' && node.id === currentUser.id) {
            return true;
        }

        return false;
    };

    /**
     * Determine if the current user can remove this node
     * SUPER_ADMIN: Can remove any node (except root)
     * LIDER_DOCE: Can remove any disciple in their network (any level)
     * LIDER_CELULA: Can remove any disciple in their network (any level)
     * DISCIPULO: Cannot remove users
     */
    const canRemoveNode = () => {
        if (!currentUser || level === 0) return false; // Cannot remove root node

        const userRole = currentUser.role;

        // SUPER_ADMIN can remove any node (except root)
        if (userRole === 'SUPER_ADMIN') return true;

        // LIDER_DOCE can remove anyone in their network (any level >= 1)
        if (userRole === 'LIDER_DOCE' && level >= 1) {
            return true;
        }

        // LIDER_CELULA can remove anyone in their network (any level >= 1)
        if (userRole === 'LIDER_CELULA' && level >= 1) {
            return true;
        }

        return false;
    };

    const showAddButton = canAddToNode();
    const showRemoveButton = canRemoveNode();

    return (
        <div className={`${level > 0 ? 'ml-4 mt-1.5' : ''}`}>
            <div
                className={`
          p-2.5 rounded-lg border-l-2 transition-all
          ${level === 0 ? 'bg-purple-50/80 dark:bg-purple-900/20 border-purple-500' :
                        level === 1 ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-500' :
                            'bg-gray-50/80 dark:bg-gray-900/40 border-gray-400 dark:border-gray-600'}
          hover:shadow-sm
        `}
            >
                <div className="flex items-center justify-between">
                    <div
                        className="flex items-center gap-2 flex-1 cursor-pointer min-w-0"
                        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
                    >
                        {hasChildren ? (
                            <div className="text-gray-500 flex-shrink-0">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </div>
                        ) : (
                            // Spacer for alignment if no children
                            <div className="w-4 h-4" />
                        )}
                        <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-800 dark:text-white text-sm truncate pr-2">{node.fullName}</h3>
                            <div className="flex items-center gap-2">
                                <span className={`
                                    inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-full tracking-wide
                                    ${node.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                        node.role === 'PASTOR' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                            node.role === 'LIDER_DOCE' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                                                node.role === 'LIDER_CELULA' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}
                                `}>
                                    {node.role === 'SUPER_ADMIN' ? 'Super Admin' :
                                        node.role === 'PASTOR' ? 'Pastor' :
                                            node.role === 'LIDER_DOCE' ? 'Doce' :
                                                node.role === 'LIDER_CELULA' ? 'Célula' : 'Discípulo'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Stats - Hidden on very small screens if needed, or kept compact */}
                        <div className="hidden sm:flex items-center gap-3 text-xs">
                            {node.disciples?.length > 0 && (
                                <div className="flex items-center gap-1 text-blue-600" title="Discípulos">
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span className="font-medium">{node.disciples.length}</span>
                                </div>
                            )}
                            {totalGuests > 0 && (
                                <div className="flex items-center gap-1 text-green-600" title="Invitados">
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span className="font-medium">{totalGuests}</span>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-1">
                            {showAddButton && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddUser(node);
                                    }}
                                    className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center justify-center"
                                    title="Agregar usuario"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {showRemoveButton && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveUser(node);
                                    }}
                                    className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center justify-center"
                                    title="Remover usuario"
                                >
                                    <UserMinus className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div className="mt-1">
                    {/* Render disciples (Recursive) */}
                    {node.disciples?.map((disciple) => (
                        <NetworkNode
                            key={`disciple-${disciple.id}`}
                            node={disciple}
                            level={level + 1}
                            currentUser={currentUser}
                            onAddUser={onAddUser}
                            onRemoveUser={onRemoveUser}
                        />
                    ))}

                    {/* Render guests - Compact view */}
                    {(node.assignedGuests?.length > 0 || node.invitedGuests?.length > 0) && (
                        <div className="ml-4 mt-1.5">
                            <div className="p-2 bg-green-50/50 dark:bg-green-900/10 border-l-2 border-green-400 dark:border-green-600 rounded-lg">
                                <h4 className="font-semibold text-green-800 dark:text-green-300 text-xs mb-1 flex items-center gap-1">
                                    <UserPlus className="w-3 h-3" />
                                    Invitados ({totalGuests})
                                </h4>
                                <div className="space-y-0.5">
                                    {node.assignedGuests?.map((guest) => (
                                        <div key={`assigned-${guest.id}`} className="text-xs text-gray-700 dark:text-gray-300 ml-2">
                                            • {guest.name} <span className="text-[10px] text-gray-500 dark:text-gray-400 italic">(Asignado)</span>
                                        </div>
                                    ))}
                                    {node.invitedGuests?.map((guest) => (
                                        <div key={`invited-${guest.id}`} className="text-xs text-gray-700 dark:text-gray-300 ml-2">
                                            • {guest.name} <span className="text-[10px] text-gray-500 dark:text-gray-400 italic">(Invitado)</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NetworkTree;
