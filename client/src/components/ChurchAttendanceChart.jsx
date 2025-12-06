import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                startDate,
                endDate
            });

            // Verificación de fechas
            if (new Date(startDate) > new Date(endDate)) {
                console.error("La fecha de inicio no puede ser posterior a la fecha de fin.");
                return;
            }
            console.log("Start Date:", startDate);
            console.log("End Date:", endDate);

            const response = await fetch(`http://localhost:5000/api/consolidar/church-attendance/daily-stats?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setStats(data);
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
            <div className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Calendar className="inline w-4 h-4 mr-1" />
                            Fecha Inicio
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Calendar className="inline w-4 h-4 mr-1" />
                            Fecha Fin
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Asistencias</p>
                            <p className="text-2xl font-bold text-green-600">{totalPresent}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Ausencias</p>
                            <p className="text-2xl font-bold text-red-600">{totalAbsent}</p>
                        </div>
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Registros</p>
                            <p className="text-2xl font-bold text-blue-600">{totalRecords}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Tasa de Asistencia</p>
                            <p className="text-2xl font-bold text-purple-600">{attendanceRate}%</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
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
