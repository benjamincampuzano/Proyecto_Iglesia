import { useState, useEffect } from 'react';
import { TrendingUp, Search, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import UserSearchSelect from './UserSearchSelect';

const StudentProgress = () => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [progressData, setProgressData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (selectedUser) {
            fetchProgress();
        } else {
            setProgressData(null);
        }
    }, [selectedUser]);

    const fetchProgress = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/consolidar/seminar/progress/${selectedUser.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Error fetching progress');
            }

            const data = await response.json();
            setProgressData(data);
        } catch (error) {
            console.error('Error fetching progress:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <Search className="w-5 h-5 text-purple-600" />
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Buscar Estudiante
                        </label>
                        <UserSearchSelect
                            selectedUser={selectedUser}
                            onSelectUser={setSelectedUser}
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <p>{error}</p>
                </div>
            )}

            {selectedUser && progressData && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-6 border-b pb-4 dark:border-gray-700">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                            Progreso de Escuela: {selectedUser.fullName}
                        </h3>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                            <p className="text-gray-500">Cargando progreso...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {progressData.levels.map((level) => (
                                <div
                                    key={level.code}
                                    className={`relative p-5 rounded-xl border-2 transition-all ${level.status === 'COMPLETADO'
                                            ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
                                            : level.status === 'EN_PROGRESO'
                                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800 shadow-md'
                                                : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 opacity-75'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                                Nivel {level.nivel}{level.seccion}
                                            </span>
                                            <h4 className="font-bold text-gray-800 dark:text-gray-100 text-lg leading-tight">
                                                {level.name}
                                            </h4>
                                        </div>
                                        {level.status === 'COMPLETADO' ? (
                                            <CheckCircle className="w-6 h-6 text-green-600" />
                                        ) : level.status === 'EN_PROGRESO' ? (
                                            <Circle className="w-6 h-6 text-blue-600 animate-pulse" />
                                        ) : (
                                            <Circle className="w-6 h-6 text-gray-300" />
                                        )}
                                    </div>

                                    <div className="mt-4">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-500 dark:text-gray-400">{level.status}</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-200">
                                                {level.data ? `${level.data.stats.attendancePercentage}%` : '0%'}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-1000 ${level.status === 'COMPLETADO' ? 'bg-green-500' : 'bg-blue-500'
                                                    }`}
                                                style={{ width: `${level.data ? level.data.stats.attendancePercentage : 0}%` }}
                                            />
                                        </div>
                                    </div>

                                    {level.data && (
                                        <div className="mt-4 text-xs text-gray-500 flex justify-between">
                                            <span>Asistencia: {level.data.stats.attendedClasses} / {level.data.stats.totalClasses}</span>
                                            {level.data.enrollment.finalGrade && (
                                                <span className="font-semibold text-purple-600">Nota: {level.data.enrollment.finalGrade}</span>
                                            )}
                                        </div>
                                    )}
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
