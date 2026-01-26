import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useAttendance from '../hooks/useAttendance';
import { Calendar, TrendingUp } from 'lucide-react';

const AttendanceChart = () => {
    const {
        stats,
        cells,
        selectedCell,
        setSelectedCell,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        loading,
    } = useAttendance();
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const checkDarkMode = () => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        };

        checkDarkMode();
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    };

    const totalPresent = stats.reduce((sum, day) => sum + day.present, 0);
    const totalAbsent = stats.reduce((sum, day) => sum + day.absent, 0);
    const totalRecords = totalPresent + totalAbsent;
    const attendanceRate = totalRecords > 0 ? ((totalPresent / totalRecords) * 100).toFixed(1) : 0;

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Célula (Opcional)
                        </label>
                        <select
                            value={selectedCell}
                            onChange={(e) => setSelectedCell(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Todas las células</option>
                            {cells.map(cell => (
                                <option key={cell.id} value={cell.id}>
                                    {cell.name} - {cell.leader.fullName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Calendar className="inline w-4 h-4 mr-1" />
                            Fecha Inicio
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Asistencias</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-500">{totalPresent}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-500" />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Ausencias</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-500">{totalAbsent}</p>
                        </div>
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-500" />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Registros</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">{totalRecords}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-500" />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Tasa de Asistencia</p>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-500">{attendanceRate}%</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    Tendencia de Asistencia
                </h2>
                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">Cargando estadísticas...</p>
                    </div>
                ) : stats.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">No hay datos de asistencia para el rango de fechas seleccionado</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={stats}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDate}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                            />
                            <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                    color: isDarkMode ? '#f3f4f6' : '#111827'
                                }}
                                itemStyle={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}
                                labelFormatter={formatDate}
                                formatter={(value, name) => [value, name === 'present' ? 'Presentes' : 'Ausentes']}
                            />
                            <Legend
                                wrapperStyle={{ paddingTop: '20px' }}
                                formatter={(value) => (
                                    <span style={{ color: isDarkMode ? '#e5e7eb' : '#374151' }}>
                                        {value === 'present' ? 'Presentes' : 'Ausentes'}
                                    </span>
                                )}
                            />
                            <Bar dataKey="present" fill="#10b981" name="Presentes" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="absent" fill="#ef4444" name="Ausentes" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default AttendanceChart;
