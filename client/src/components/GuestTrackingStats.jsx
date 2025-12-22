import { useState, useEffect } from 'react';
import { Users, Phone, Home, Calendar, Filter, PieChart, BarChart2 } from 'lucide-react';
import api from '../utils/api';

const GuestTrackingStats = () => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchStats();
    }, [startDate, endDate]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const url = `/consolidar/stats/guest-tracking${params.toString() ? '?' + params.toString() : ''}`;
            const response = await api.get(url);
            setStats(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching guest tracking stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const totals = stats.reduce((acc, curr) => ({
        total: acc.total + curr.total,
        withCall: acc.withCall + curr.withCall,
        withoutCall: acc.withoutCall + curr.withoutCall,
        withVisit: acc.withVisit + curr.withVisit,
        withoutVisit: acc.withoutVisit + curr.withoutVisit,
    }), { total: 0, withCall: 0, withoutCall: 0, withVisit: 0, withoutVisit: 0 });

    if (loading && stats.length === 0) {
        return <div className="text-center py-8">Cargando reporte...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <BarChart2 className="w-6 h-6 text-blue-600" />
                        Reporte de Seguimiento
                    </h2>
                    <div className="flex items-center gap-3">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                        />
                        <span className="text-gray-400">a</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                        />
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                        <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Invitados</div>
                        <div className="text-2xl font-bold text-blue-900 dark:text-white mt-1">{totals.total}</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
                        <div className="text-sm text-green-600 dark:text-green-400 font-medium">Con Llamada</div>
                        <div className="text-2xl font-bold text-green-900 dark:text-white mt-1">{totals.withCall}</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800">
                        <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">Sin Llamada</div>
                        <div className="text-2xl font-bold text-orange-900 dark:text-white mt-1">{totals.withoutCall}</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
                        <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Con Visita</div>
                        <div className="text-2xl font-bold text-purple-900 dark:text-white mt-1">{totals.withVisit}</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800">
                        <div className="text-sm text-red-600 dark:text-red-400 font-medium">Sin Visita</div>
                        <div className="text-2xl font-bold text-red-900 dark:text-white mt-1">{totals.withoutVisit}</div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Líder</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Llamadas (Sí/No)</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Visitas (Sí/No)</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">% Efectividad</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {stats.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                    {row.leaderName}
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                    {row.total}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-sm font-bold text-green-600 dark:text-green-400">{row.withCall}</span>
                                        <span className="text-gray-300 dark:text-gray-600">/</span>
                                        <span className="text-sm font-bold text-red-400 dark:text-red-500">{row.withoutCall}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{row.withVisit}</span>
                                        <span className="text-gray-300 dark:text-gray-600">/</span>
                                        <span className="text-sm font-bold text-red-400 dark:text-red-500">{row.withoutVisit}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="bg-blue-600 h-full"
                                                style={{ width: `${(row.total > 0 ? ((row.withCall + row.withVisit) / (row.total * 2)) * 100 : 0)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {row.total > 0 ? (((row.withCall + row.withVisit) / (row.total * 2)) * 100).toFixed(1) : 0}%
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GuestTrackingStats;
