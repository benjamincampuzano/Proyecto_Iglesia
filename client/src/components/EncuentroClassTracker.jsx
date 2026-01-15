import { useState } from 'react';
import { Check, X, UserPlus } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const EncuentroClassTracker = ({ registrations, onRefresh, onConvert, canModify }) => {
    const { user } = useAuth();
    const [updating, setUpdating] = useState({});
    const isRestricted = !canModify;

    const handleToggle = async (registrationId, classNumber, currentStatus) => {
        const key = `${registrationId}-${classNumber}`;
        setUpdating(prev => ({ ...prev, [key]: true }));

        try {
            await api.put(`/encuentros/registrations/${registrationId}/classes/${classNumber}`, {
                attended: !currentStatus
            });
            onRefresh();
        } catch (error) {
            console.error('Error updating attendance:', error);
            alert('Error al actualizar asistencia');
        } finally {
            setUpdating(prev => ({ ...prev, [key]: false }));
        }
    };

    const isAttended = (reg, classNum) => {
        return reg.classAttendances?.some(c => c.classNumber === classNum && c.attended);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-900 z-10 w-64">
                                Participante
                            </th>
                            {/* Pre-Encuentro Headers */}
                            {[1, 2, 3, 4, 5].map(num => (
                                <th key={num} className="px-2 py-4 text-center text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider min-w-[50px]">
                                    Pre {num}
                                </th>
                            ))}
                            {/* Spacer for Event */}
                            <th className="px-4 py-4 text-center text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider bg-yellow-50 dark:bg-yellow-900/10">
                                EVENTO
                            </th>
                            {/* Post-Encuentro Headers */}
                            {[6, 7, 8, 9, 10].map(num => (
                                <th key={num} className="px-2 py-4 text-center text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider min-w-[50px]">
                                    Pos {num - 5}
                                </th>
                            ))}
                            {/* Actions Header */}
                            {!isRestricted && (
                                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Acciones
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {registrations.map((reg) => (
                            <tr key={reg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white dark:bg-gray-800 z-10">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {reg.guest?.name || reg.user?.fullName}
                                    </div>
                                    <div className="text-xs text-gray-500">{reg.guest?.status || 'Discípulo'}</div>
                                </td>

                                {/* Pre-Encuentro Cells */}
                                {[1, 2, 3, 4, 5].map(num => {
                                    const attended = isAttended(reg, num);
                                    const loading = updating[`${reg.id}-${num}`];
                                    return (
                                        <td key={num} className="px-2 py-4 text-center">
                                            <button
                                                onClick={() => handleToggle(reg.id, num, attended)}
                                                disabled={loading || isRestricted}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${attended
                                                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500'
                                                    } ${loading || isRestricted ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
                                            >
                                                {attended ? <Check size={16} /> : <span className="text-xs">{num}</span>}
                                            </button>
                                        </td>
                                    );
                                })}

                                {/* Event Spacer Cell */}
                                <td className="px-4 py-4 text-center bg-yellow-50 dark:bg-yellow-900/10 border-l border-r border-gray-200 dark:border-gray-700">
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-xs font-bold text-gray-400">ENC</span>
                                    </div>
                                </td>

                                {/* Post-Encuentro Cells */}
                                {[6, 7, 8, 9, 10].map(num => {
                                    const attended = isAttended(reg, num);
                                    const loading = updating[`${reg.id}-${num}`];
                                    return (
                                        <td key={num} className="px-2 py-4 text-center">
                                            <button
                                                onClick={() => handleToggle(reg.id, num, attended)}
                                                disabled={loading || isRestricted}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${attended
                                                    ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500'
                                                    } ${loading || isRestricted ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
                                            >
                                                {attended ? <Check size={16} /> : <span className="text-xs">{num - 5}</span>}
                                            </button>
                                        </td>
                                    );
                                })}

                                {/* Actions Cell */}
                                {canModify && (
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        {reg.guest && (
                                            <button
                                                onClick={() => onConvert && onConvert(reg)}
                                                className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 inline-flex items-center"
                                                title="Convertir a Discípulo"
                                            >
                                                <UserPlus size={18} />
                                            </button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                        {registrations.length === 0 && (
                            <tr>
                                <td colSpan={isRestricted ? 11 : 12} className="px-6 py-8 text-center text-gray-500">
                                    No hay registros aún.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EncuentroClassTracker;
