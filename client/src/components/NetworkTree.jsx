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
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">
                    Red de Discipulado: {network.fullName}
                </h2>
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
     * MIEMBRO: Cannot manage
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
     * MIEMBRO: Cannot remove users
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
        <div className={`${level > 0 ? 'ml-6 mt-3' : ''}`}>
            <div
                className={`
          p-4 rounded-lg border-l-4 transition-all
          ${level === 0 ? 'bg-purple-50 border-purple-500' :
                        level === 1 ? 'bg-blue-50 border-blue-500' :
                            'bg-gray-50 border-gray-400'}
          hover:shadow-md
        `}
            >
                <div className="flex items-center justify-between">
                    <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
                    >
                        {hasChildren && (
                            <div className="text-gray-600">
                                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            </div>
                        )}
                        <Users className="w-5 h-5 text-gray-600" />
                        <div>
                            <h3 className="font-semibold text-gray-800">{node.fullName}</h3>
                            <p className="text-sm text-gray-500">{node.email}</p>
                            <span className={`
                inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full
                ${node.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-800' :
                                    node.role === 'PASTOR' ? 'bg-green-100 text-green-800' :
                                        node.role === 'LIDER_DOCE' ? 'bg-purple-100 text-purple-800' :
                                            node.role === 'LIDER_CELULA' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'}
              `}>
                                {node.role === 'SUPER_ADMIN' ? 'Super Admin' :
                                    node.role === 'PASTOR' ? 'Pastor' :
                                        node.role === 'LIDER_DOCE' ? 'Líder de Los Doce' :
                                            node.role === 'LIDER_CELULA' ? 'Líder de Célula' : 'Miembro'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Stats */}
                        <div className="flex gap-4 text-sm">
                            {node.disciples?.length > 0 && (
                                <div className="flex items-center gap-1 text-blue-600">
                                    <UserCheck className="w-4 h-4" />
                                    <span className="font-medium">{node.disciples.length}</span>
                                    <span className="text-gray-500">discípulos</span>
                                </div>
                            )}
                            {totalGuests > 0 && (
                                <div className="flex items-center gap-1 text-green-600">
                                    <UserPlus className="w-4 h-4" />
                                    <span className="font-medium">{totalGuests}</span>
                                    <span className="text-gray-500">invitados</span>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            {showAddButton && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddUser(node);
                                    }}
                                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm"
                                    title="Agregar usuario a la red"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Agregar</span>
                                </button>
                            )}
                            {showRemoveButton && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveUser(node);
                                    }}
                                    className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1 text-sm"
                                    title="Remover usuario de la red"
                                >
                                    <UserMinus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Remover</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div className="mt-2">
                    {/* Render disciples */}
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

                    {/* Render guests */}
                    {(node.assignedGuests?.length > 0 || node.invitedGuests?.length > 0) && (
                        <div className="ml-6 mt-3">
                            <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded-lg">
                                <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                                    <UserPlus className="w-4 h-4" />
                                    Invitados ({totalGuests})
                                </h4>
                                <div className="space-y-1">
                                    {node.assignedGuests?.map((guest) => (
                                        <div key={`assigned-${guest.id}`} className="text-sm text-gray-700 ml-4">
                                            • {guest.name} - {guest.phone}
                                            <span className="ml-2 text-xs text-gray-500">(Asignado)</span>
                                        </div>
                                    ))}
                                    {node.invitedGuests?.map((guest) => (
                                        <div key={`invited-${guest.id}`} className="text-sm text-gray-700 ml-4">
                                            • {guest.name} - {guest.phone}
                                            <span className="ml-2 text-xs text-gray-500">(Invitado)</span>
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
