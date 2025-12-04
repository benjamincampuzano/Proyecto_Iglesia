import { useState, useEffect } from 'react';
import { TrendingUp, Search } from 'lucide-react';
import UserSearchSelect from './UserSearchSelect';

const StudentProgress = () => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [progress, setProgress] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedUser) {
            fetchProgress();
        }
    }, [selectedUser]);

    const fetchProgress = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/consolidar/seminar/progress/${selectedUser.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setProgress(data);
        } catch (error) {
            console.error('Error fetching progress:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-4">
                    <Search className="w-5 h-5 text-purple-600" />
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Buscar Estudiante
                        </label>
                        <UserSearchSelect
                            selectedUser={selectedUser}
                            onSelectUser={setSelectedUser}
                        />
                    </div>
                </div>
            </div>

            {selectedUser && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                        <h3 className="text-xl font-semibold text-gray-800">
                            Progreso de {selectedUser.fullName}
                        </h3>
                    </div>

                    {loading ? (
                        <div className="text-center py-8">Cargando progreso...</div>
                    ) : progress.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No hay inscripciones registradas para este estudiante
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {progress.map(({ enrollment, stats }) => (
                                <div key={enrollment.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-semibold text-gray-800">
                                                Módulo {enrollment.module.moduleNumber}: {enrollment.module.name}
                                            </h4>
                                            <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${enrollment.status === 'COMPLETADO' ? 'bg-green-100 text-green-800' :
                                                    enrollment.status === 'EN_PROGRESO' ? 'bg-blue-100 text-blue-800' :
                                                        enrollment.status === 'ABANDONADO' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                }`}>
                                                {enrollment.status}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-purple-600">
                                                {stats.attendancePercentage}%
                                            </div>
                                            <div className="text-xs text-gray-500">Asistencia</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                        <div className="text-center p-3 bg-green-50 rounded">
                                            <div className="text-2xl font-bold text-green-700">
                                                {stats.attendedClasses}
                                            </div>
                                            <div className="text-xs text-gray-600">Asistió</div>
                                        </div>
                                        <div className="text-center p-3 bg-yellow-50 rounded">
                                            <div className="text-2xl font-bold text-yellow-700">
                                                {stats.justifiedAbsences}
                                            </div>
                                            <div className="text-xs text-gray-600">Ausencia Justificada</div>
                                        </div>
                                        <div className="text-center p-3 bg-red-50 rounded">
                                            <div className="text-2xl font-bold text-red-700">
                                                {stats.unjustifiedAbsences}
                                            </div>
                                            <div className="text-xs text-gray-600">Ausencia No Justificada</div>
                                        </div>
                                        <div className="text-center p-3 bg-gray-50 rounded">
                                            <div className="text-2xl font-bold text-gray-700">
                                                {stats.dropped}
                                            </div>
                                            <div className="text-xs text-gray-600">Baja</div>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-purple-600 h-2 rounded-full transition-all"
                                            style={{ width: `${stats.attendancePercentage}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 text-right">
                                        {stats.attendedClasses} de {stats.totalClasses} clases
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentProgress;
