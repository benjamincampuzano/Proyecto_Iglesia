import { useState, useEffect } from 'react';
import { Calendar, Download, Users, TrendingUp, UserCheck, Loader } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import api from '../utils/api';

const GuestStats = () => {
    const { user: currentUser } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        // Set default date range (last 30 days)
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            fetchStats();
        }
    }, [startDate, endDate]);

    const fetchStats = async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const res = await api.get(`/guests/stats?${params.toString()}`);

            setStats(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cargar estadísticas');
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = () => {
        if (!stats) return;

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Summary sheet
        const summaryData = [
            ['Estadísticas de Invitados'],
            ['Período', `${startDate} a ${endDate}`],
            [''],
            ['Total de Invitados', stats.totalGuests],
            ['Nuevos', stats.byStatus.NUEVO || 0],
            ['Llamados', stats.byStatus.CONTACTADO || 0],
            ['Visitados', stats.byStatus.CONSOLIDADO || 0],
            ['Consolidados', stats.byStatus.GANADO || 0],
            [''],
            ['Tasa de Conversión', `${stats.conversionRate}%`],
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumen');

        // Top inviters sheet
        if (stats.topInviters && stats.topInviters.length > 0) {
            const invitersData = [
                ['Top Invitadores'],
                ['Nombre', 'Total Invitados'],
                ...stats.topInviters.map(inv => [inv.name, inv.count])
            ];
            const invitersSheet = XLSX.utils.aoa_to_sheet(invitersData);
            XLSX.utils.book_append_sheet(wb, invitersSheet, 'Invitadores');
        }

        // Save file
        const fileName = `estadisticas_invitados_${startDate}_${endDate}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const statusColors = {
        NUEVO: '#3B82F6',
        CONTACTADO: '#EAB308',
        CONSOLIDADO: '#A855F7',
        GANADO: '#10B981',
    };

    const statusLabels = {
        NUEVO: 'Nuevo',
        CONTACTADO: 'Llamado',
        CONSOLIDADO: 'Visitado',
        GANADO: 'Consolidado',
    };

    const getStatusChartData = () => {
        if (!stats) return [];
        return Object.entries(stats.byStatus).map(([status, count]) => ({
            name: statusLabels[status] || status,
            value: count,
            color: statusColors[status]
        }));
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Estadísticas de Invitados</h2>

                {error && (
                    <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {/* Date Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Fecha Inicio
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Fecha Fin
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    {currentUser?.roles?.some(r => ['ADMIN', 'LIDER_DOCE', 'PASTOR'].includes(r)) && (
                        <div className="flex items-end">
                            <button
                                onClick={exportToExcel}
                                disabled={!stats || loading}
                                className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                <Download size={20} />
                                <span>Exportar a Excel</span>
                            </button>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader size={32} className="animate-spin text-blue-500" />
                    </div>
                ) : stats ? (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">Total Invitados</p>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalGuests}</p>
                                    </div>
                                    <Users className="text-blue-500" size={32} />
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">Pr. Mensual</p>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.monthlyAverage || 0}</p>
                                    </div>
                                    <TrendingUp className="text-purple-500" size={32} />
                                </div>
                            </div>


                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">Nuevos</p>
                                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.byStatus.NUEVO || 0}</p>
                                    </div>
                                    <TrendingUp className="text-blue-500" size={32} />
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">Consolidados</p>
                                        <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.byStatus.GANADO || 0}</p>
                                    </div>
                                    <UserCheck className="text-green-500" size={32} />
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">Tasa Conversión</p>
                                        <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.conversionRate}%</p>
                                    </div>
                                    <TrendingUp className="text-purple-500" size={32} />
                                </div>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Status Distribution */}
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribución por Estado</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={getStatusChartData()}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {getStatusChartData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Top Inviters */}
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Invitadores</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={stats.topInviters || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                                        <XAxis dataKey="name" stroke="#64748b" />
                                        <YAxis stroke="#64748b" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' }}
                                        />
                                        <Bar dataKey="count" fill="#3B82F6" name="Invitados" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Invitations by LIDER_DOCE */}
                            {stats.invitationsByLiderDoce && stats.invitationsByLiderDoce.length > 0 && (
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600 col-span-1 lg:col-span-2">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invitaciones por Líder 12</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={stats.invitationsByLiderDoce}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                                            <XAxis dataKey="name" stroke="#64748b" />
                                            <YAxis stroke="#64748b" />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' }}
                                            />
                                            <Bar dataKey="count" fill="#10B981" name="Invitados" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                        </div>

                        {/* Top Inviters Table */}
                        {stats.topInviters && stats.topInviters.length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Detalle de Invitadores</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-100 dark:bg-gray-800">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">#</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Nombre</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-200">Total Invitados</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-600">
                                            {stats.topInviters.map((inviter, index) => (
                                                <tr key={index} className="hover:bg-white dark:hover:bg-gray-600/50 transition-colors">
                                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-300">{index + 1}</td>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white">{inviter.name}</td>
                                                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-semibold">{inviter.count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </div >
    );
};

export default GuestStats;
