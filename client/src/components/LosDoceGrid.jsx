import { useState } from 'react';
import { Users, ChevronRight } from 'lucide-react';

const LosDoceGrid = ({ losDoce, onSelectLeader }) => {
    const [selectedId, setSelectedId] = useState(null);

    const handleClick = (leader) => {
        setSelectedId(leader.id);
        onSelectLeader(leader);
    };

    if (!losDoce || losDoce.length === 0) {
        return (
            <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No hay líderes de Los Doce registrados</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {losDoce.map((leader) => (
                <div
                    key={leader.id}
                    onClick={() => handleClick(leader)}
                    className={`
            p-6 rounded-lg border-2 cursor-pointer transition-all duration-200
            hover:shadow-lg hover:scale-105
            ${selectedId === leader.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-blue-300'
                        }
          `}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                {leader.fullName}
                            </h3>
                            <p className="text-sm text-gray-500">{leader.email}</p>
                            <span className="inline-block mt-2 px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                                Líder de Los Doce
                            </span>
                        </div>
                        <ChevronRight className={`w-6 h-6 transition-transform ${selectedId === leader.id ? 'text-blue-500 transform rotate-90' : 'text-gray-400'}`} />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default LosDoceGrid;
