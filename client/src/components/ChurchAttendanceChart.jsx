import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import { Calendar, TrendingUp } from 'lucide-react';

const ChurchAttendanceChart = () => {
    const [stats, setStats] = useState([]);
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchStats();
    }, [startDate, endDate]);

    const fetchStats = async () => {
        try {
            setLoading(true);

            // Verificación de fechas
            if (new Date(startDate) > new Date(endDate)) {
                console.error("La fecha de inicio no puede ser posterior a la fecha de fin.");
                return;
            }

            const response = await api.get('/consolidar/church-attendance/daily-stats', {
                params: { startDate, endDate }
            });
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        // Ajustar para mostrar la fecha local correctamente
        // Dado que la fecha viene como YYYY-MM-DD, creamos la fecha usando componentes locales para evitar desfase de zona horaria
        const [year, month, day] = dateString.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);

        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: 'short'
        }).format(localDate);
    };
    const totalPresent = Array.isArray(stats) ? stats.reduce((sum, day) => sum + day.present, 0) : 0;
    const totalAbsent = Array.isArray(stats) ? stats.reduce((sum, day) => sum + day.absent, 0) : 0;
    const totalRecords = totalPresent + totalAbsent;
    const attendanceRate = totalRecords > 0 ? ((totalPresent / totalRecords) * 100).toFixed(1) : 0;

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Calendar className="inline w-4 h-4 mr-1" />
                            Fecha Inicio
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Calendar className="inline w-4 h-4 mr-1" />
                            Fecha Fin
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Asistencias</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalPresent}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Ausencias</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totalAbsent}</p>
                        </div>
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Registros</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalRecords}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Tasa de Asistencia</p>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{attendanceRate}%</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                    Asistencia Diaria a la Iglesia
                </h2>
                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Cargando estadísticas...</p>
                    </div>
                ) : stats.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No hay datos de asistencia para el rango de fechas seleccionado</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={stats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDate}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis />
                            <Tooltip
                                labelFormatter={formatDate}
                                formatter={(value, name) => [value, name === 'present' ? 'Presentes' : 'Ausentes']}
                            />
                            <Legend
                                formatter={(value) => value === 'present' ? 'Presentes' : 'Ausentes'}
                            />
                            <Bar dataKey="present" fill="#10b981" name="Presentes" />
                            <Bar dataKey="absent" fill="#ef4444" name="Ausentes" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default ChurchAttendanceChart;
