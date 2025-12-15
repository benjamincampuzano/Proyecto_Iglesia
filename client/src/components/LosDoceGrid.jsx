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
                <p className="text-gray-500">No hay Pastores registrados</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {losDoce.map((leader) => (
                <div
                    key={leader.id}
                    onClick={() => handleClick(leader)}
                    className={`
            p-3 rounded-lg border hover:shadow-md cursor-pointer transition-all duration-200
            hover:scale-[1.02]
            ${selectedId === leader.id
                            ? 'border-blue-500 bg-blue-50/50'
                            : 'border-gray-200 bg-white hover:border-blue-300'
                        }
          `}
                >
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-800 truncate" title={leader.fullName}>
                                {leader.fullName}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">{leader.email}</p>
                            <span className={`
                                inline-block mt-1.5 px-2 py-0.5 text-[10px] uppercase tracking-wide font-bold rounded-full
                                ${leader.role === 'PASTOR' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}
                            `}>
                                {leader.role === 'PASTOR' ? 'Pastor' : 'Líder 12'}
                            </span>
                        </div>
                        <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${selectedId === leader.id ? 'text-blue-500 transform rotate-90' : 'text-gray-400'}`} />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default LosDoceGrid;
