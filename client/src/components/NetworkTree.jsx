import { useState } from 'react';
import { Users, UserCheck, UserPlus, ChevronDown, ChevronRight } from 'lucide-react';

const NetworkTree = ({ network }) => {
    if (!network) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">Selecciona un líder para ver su red de discipulado</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
                Red de Discipulado: {network.fullName}
            </h2>
            <NetworkNode node={network} level={0} />
        </div>
    );
};

const NetworkNode = ({ node, level }) => {
    const [isExpanded, setIsExpanded] = useState(level < 2);

    const hasChildren = node.disciples?.length > 0 ||
        node.assignedGuests?.length > 0 ||
        node.invitedGuests?.length > 0;

    const totalGuests = (node.assignedGuests?.length || 0) + (node.invitedGuests?.length || 0);

    return (
        <div className={`${level > 0 ? 'ml-6 mt-3' : ''}`}>
            <div
                className={`
          p-4 rounded-lg border-l-4 cursor-pointer transition-all
          ${level === 0 ? 'bg-purple-50 border-purple-500' :
                        level === 1 ? 'bg-blue-50 border-blue-500' :
                            'bg-gray-50 border-gray-400'}
          hover:shadow-md
        `}
                onClick={() => hasChildren && setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
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
                ${node.role === 'LIDER_DOCE' ? 'bg-purple-100 text-purple-800' :
                                    node.role === 'LIDER_CELULA' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'}
              `}>
                                {node.role === 'LIDER_DOCE' ? 'Líder de Los Doce' :
                                    node.role === 'LIDER_CELULA' ? 'Líder de Célula' :
                                        node.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Miembro'}
                            </span>
                        </div>
                    </div>
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
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div className="mt-2">
                    {/* Render disciples */}
                    {node.disciples?.map((disciple) => (
                        <NetworkNode key={`disciple-${disciple.id}`} node={disciple} level={level + 1} />
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
