import { useState, useEffect } from 'react';
import api from '../utils/api';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, BarChart, Bar, Cell as ReCell, PieChart, Pie
} from 'recharts';
import {
    Activity, User, Calendar, Filter, Search, Download, Trash2,
    Edit, PlusCircle, LogIn, ChevronLeft, ChevronRight
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const AuditDashboard = () => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ currentPage: 1, pages: 1 });
    const [filters, setFilters] = useState({
        page: 1,
        action: '',
        entityType: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [filters]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams(filters);
            const response = await api.get(`/audit/logs?${params}`);
            const data = response.data;
            if (data.logs) {
                setLogs(data.logs);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/audit/stats?days=30');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'LOGIN': return <LogIn className="text-blue-500" size={18} />;
            case 'CREATE': return <PlusCircle className="text-green-500" size={18} />;
            case 'UPDATE': return <Edit className="text-amber-500" size={18} />;
            case 'DELETE': return <Trash2 className="text-red-500" size={18} />;
            default: return <Activity className="text-gray-500" size={18} />;
        }
    };

    const getEntityColor = (type) => {
        const colors = {
            'CELL': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'CONVENTION': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            'ENCUENTRO': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
            'USER': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            'SESSION': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        };
        return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Activity className="text-blue-600" size={32} />
                        Panel de Auditoría
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Seguimiento detallado de actividades y modificaciones en la plataforma.
                    </p>
                </div>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Inicios de Sesión (Últimos 30 días)</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.loginsPerDay}>
                                    <defs>
                                        <linearGradient id="colorLogin" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="date" hide />
                                    <YAxis hide />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLogin)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Distribución de Acciones</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.actionDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="action" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="_count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                        {stats.actionDistribution.map((entry, index) => (
                                            <ReCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Acción</label>
                    <select
                        name="action"
                        value={filters.action}
                        onChange={handleFilterChange}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                        <option value="">Todas</option>
                        <option value="LOGIN">Inicio de Sesión</option>
                        <option value="CREATE">Creación</option>
                        <option value="UPDATE">Edición</option>
                        <option value="DELETE">Eliminación</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Módulo</label>
                    <select
                        name="entityType"
                        value={filters.entityType}
                        onChange={handleFilterChange}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                        <option value="">Todos</option>
                        <option value="CELL">Células</option>
                        <option value="CONVENTION">Convenciones</option>
                        <option value="ENCUENTRO">Encuentros</option>
                        <option value="USER">Usuarios</option>
                        <option value="SESSION">Sesiones</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Desde</label>
                    <input
                        type="date"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleFilterChange}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hasta</label>
                    <input
                        type="date"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleFilterChange}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha y Hora</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Módulo</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Detalles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-6 py-4 h-12 bg-gray-50/50 dark:bg-gray-800/50"></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No se encontraron registros.</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                            {formatDate(log.createdAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                                                    {log.user?.fullName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-none">
                                                        {log.user?.fullName || 'Sistema'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">{log.user?.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                {getActionIcon(log.action)}
                                                <span className="font-medium text-gray-700 dark:text-gray-200">{log.action}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEntityColor(log.entityType)}`}>
                                                {log.entityType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                            {log.details ? log.details : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Mostrando página <span className="font-medium">{pagination.currentPage}</span> de <span className="font-medium">{pagination.pages}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                            disabled={filters.page === 1}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                            disabled={filters.page === pagination.pages}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditDashboard;
