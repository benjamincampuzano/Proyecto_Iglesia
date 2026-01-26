import { useState, useEffect } from 'react';
import { Calendar, Printer, TrendingUp, Users, BookOpen, MapPin, Award, Lock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ConsolidatedStatsReport = ({ simpleMode = false }) => {
    const { user, hasAnyRole } = useAuth();
    const [stats, setStats] = useState(null);
    // Default to last 5 years for a complete general history
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - 5);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    // Access Control
    const ALLOWED_ROLES = ['PASTOR', 'LIDER_DOCE', 'ADMIN'];
    const hasAccess = hasAnyRole(ALLOWED_ROLES);

    useEffect(() => {
        if (hasAccess) {
            fetchStats();
        }
    }, [startDate, endDate, hasAccess]);

    const fetchStats = async () => {
        try {
            setLoading(true);

            const response = await api.get('/consolidar/stats/general', {
                params: { startDate, endDate }
            });
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching consolidated stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
    };

    // Restricted Access View
    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-lg shadow text-center">
                <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4">
                    <Lock className="w-12 h-12 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Acceso Restringido</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                    Este informe solo está disponible para usuarios con perfil de <strong>Pastor</strong>, <strong>Líder de 12</strong> o <strong>Admin</strong>.
                </p>
            </div>
        );
    }

    if (!stats && loading) return <div className="text-center py-10">Cargando reporte...</div>;
    if (!stats) return <div className="text-center py-10">No hay datos disponibles</div>;

    // --- Data Transformation Helpers ---
    const transformToChartData = (dataObj) => {
        if (!dataObj) return [];
        return Object.keys(dataObj).map(key => ({
            name: key,
            ...dataObj[key]
        }));
    };

    const transformGuestsData = (dataObj) => {
        if (!dataObj) return [];
        return Object.keys(dataObj).map(leader => ({
            name: leader,
            count: dataObj[leader]
        }));
    };

    // Prepare Chart Data
    const attendanceData = transformToChartData(stats.attendanceByMonth);
    const guestsData = transformGuestsData(stats.guestsByLeader);
    // const encuentrosData = transformToChartData(stats.encuentrosByMonth);
    // const conventionsData = transformToChartData(stats.conventionsByYear);

    // Extract all unique leaders for dynamic Lines/Bars
    const getAllLeaders = (dataObj) => {
        const leaders = new Set();
        Object.values(dataObj).forEach(monthObj => {
            Object.keys(monthObj).forEach(l => leaders.add(l));
        });
        return Array.from(leaders);
    };

    const attendanceLeaders = getAllLeaders(stats.attendanceByMonth || {});
    // const encuentrosLeaders = getAllLeaders(stats.encuentrosByMonth || {});
    // const conventionsLeaders = getAllLeaders(stats.conventionsByYear || {});

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
    const getColor = (index) => COLORS[index % COLORS.length];

    return (
        <div className={`space-y-8 ${simpleMode ? 'p-0' : 'p-4'} print:p-0`}>
            {/* Header / Actions - With Date Inputs */}
            <div className={`flex flex-col ${simpleMode ? 'gap-2' : 'md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm gap-4'} print:hidden`}>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar size={20} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Desde:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Hasta:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                </div>

                {!simpleMode && (
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Printer size={20} />
                        Imprimir Reporte
                    </button>
                )}
            </div>

            {/* Report Content */}
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg ${simpleMode ? 'p-4' : 'p-8'} print:shadow-none print:p-0`} id="printable-report">

                {/* Report Header */}
                {!simpleMode && (
                    <div className="text-center border-b dark:border-gray-700 pb-6 mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Informe General</h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            Reporte Histórico General
                        </p>
                    </div>
                )}

                {/* 1. Global KPIs - NEW SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                                <Users size={20} />
                            </div>
                            <span className="text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-tight">Total Invitados</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-blue-900 dark:text-white">{stats.summary.totalGuests}</span>
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">En el período seleccionado</span>
                        </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-xl border border-green-100 dark:border-green-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg text-green-600 dark:text-green-300">
                                <Award size={20} />
                            </div>
                            <span className="text-sm font-bold text-green-800 dark:text-green-200 uppercase tracking-tight">Conversiones</span>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-green-900 dark:text-white">{stats.summary.totalConversions}</span>
                                <span className="text-lg font-bold text-green-600 dark:text-green-400">({stats.summary.conversionRate}%)</span>
                            </div>
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">Personas Ganadas</span>
                        </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-xl border border-red-100 dark:border-red-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg text-red-600 dark:text-red-300">
                                <MapPin size={20} />
                            </div>
                            <span className="text-sm font-bold text-red-800 dark:text-red-200 uppercase tracking-tight">Células Activas</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-red-900 dark:text-white">{stats.summary.totalCells}</span>
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">Puntos de evangelización</span>
                        </div>
                    </div>

                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-lg text-indigo-600 dark:text-indigo-300">
                                <BookOpen size={20} />
                            </div>
                            <span className="text-sm font-bold text-indigo-800 dark:text-indigo-200 uppercase tracking-tight">Capacitación Destino</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-indigo-900 dark:text-white">{stats.summary.activeStudents}</span>
                            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1">Estudiantes en capacitación</span>
                        </div>
                    </div>
                </div>

                {/* 2. Guest Lifecycle Tracking - NEW SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 page-break-inside-avoid">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                            <TrendingUp className="text-blue-500" /> Seguimiento de Invitados
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Personas con Llamada</span>
                                    <span className="text-sm font-bold text-gray-800 dark:text-white">
                                        {stats.trackingStats.withCall} / {stats.summary.totalGuests}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                                    <div
                                        className="bg-blue-500 h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${(stats.trackingStats.withCall / stats.summary.totalGuests * 100) || 0}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Personas con Visita</span>
                                    <span className="text-sm font-bold text-gray-800 dark:text-white">
                                        {stats.trackingStats.withVisit} / {stats.summary.totalGuests}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                                    <div
                                        className="bg-green-500 h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${(stats.trackingStats.withVisit / stats.summary.totalGuests * 100) || 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                            <Award className="text-yellow-500" /> Embudo de Consolidación
                        </h3>
                        <div className="flex flex-col items-center justify-center h-40">
                            <div className="w-full max-w-[200px] flex flex-col gap-1">
                                <div className="bg-blue-500/20 text-blue-700 dark:text-blue-300 py-1.5 px-4 rounded-lg text-center font-bold text-xs border border-blue-200 dark:border-blue-800">
                                    INVITADOS: {stats.summary.totalGuests}
                                </div>
                                <div className="flex justify-center my-0.5"><div className="w-0.5 h-3 bg-gray-300 dark:bg-gray-600"></div></div>
                                <div
                                    className="bg-green-500/20 text-green-700 dark:text-green-300 py-1.5 px-4 rounded-lg text-center font-bold text-xs border border-green-200 dark:border-green-800 mx-4"
                                    title="Miembros Ganados"
                                >
                                    GANADOS: {stats.summary.totalConversions}
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-4 italic">
                                Tasa de éxito: {stats.summary.conversionRate}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3. Guests by Leader (Doce) */}
                <div className="mb-10 page-break-inside-avoid shadow-sm border border-gray-100 dark:border-gray-700 p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <Users className="text-purple-600" /> Distribución de Invitados por Red
                    </h3>
                    <div className="h-64 w-full">
                        {guestsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={guestsData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Invitados" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="text-gray-400 italic text-center pt-10">No hay datos de invitados en este período.</p>}
                    </div>
                </div>

                {/* 4. Church Attendance by Month (Grouped by Leader) */}
                <div className="mb-10 page-break-inside-avoid shadow-sm border border-gray-100 dark:border-gray-700 p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="text-green-600" /> Asistencia a la Iglesia (Mensual por Lider)
                    </h3>
                    <div className="h-80 w-full">
                        {attendanceData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={attendanceData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    {attendanceLeaders.map((leader, index) => (
                                        <Bar key={leader} dataKey={leader} stackId="a" fill={getColor(index)} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="text-gray-400 italic text-center pt-10">No hay datos de asistencia.</p>}
                    </div>
                </div>

                {/* 3. Student Stats */}
                <div className="mb-10 page-break-inside-avoid">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <BookOpen className="text-indigo-600" /> Rendimiento Académico (Por Clase)
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border dark:border-gray-700 rounded-lg overflow-hidden">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 uppercase">
                                <tr>
                                    <th className="p-3">Clase / Módulo</th>
                                    <th className="p-3 text-center">Cantidad Estudiantes</th>
                                    <th className="p-3 text-center">Promedio Notas</th>
                                    <th className="p-3 text-center">Asistencia Promedio</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 dark:text-gray-300">
                                {stats.studentStats && stats.studentStats.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="p-3 font-medium">{item.moduleName}</td>
                                        <td className="p-3 text-center">{item.studentCount}</td>
                                        <td className="p-3 text-center font-bold text-blue-600">{item.avgGrade}</td>
                                        <td className="p-3 text-center">{item.avgAttendance}%</td>
                                    </tr>
                                ))}
                                {(!stats.studentStats || stats.studentStats.length === 0) && (
                                    <tr><td colSpan="4" className="p-4 text-center text-gray-400">Sin datos académicos</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 4. Cells by Lider Doce (Stats + Map List) */}
                <div className="mb-10 page-break-inside-avoid">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <MapPin className="text-red-600" /> Células y Ubicación
                    </h2>

                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                        {/* Stats Table */}
                        <div>
                            <table className="w-full text-sm text-left border dark:border-gray-700 rounded-lg">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300">
                                    <tr>
                                        <th className="p-2">Lider Doce</th>
                                        <th className="p-2 text-center">Cant. Células</th>
                                        <th className="p-2 text-center">Asistencia Prom.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 dark:text-gray-300">
                                    {Object.keys(stats.cellsByLeader || {}).map((leader, i) => (
                                        <tr key={i}>
                                            <td className="p-2 font-medium">{leader}</td>
                                            <td className="p-2 text-center">{stats.cellsByLeader[leader].count}</td>
                                            <td className="p-2 text-center">{stats.cellsByLeader[leader].avgAttendance}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Location List ("Map") */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg h-60 overflow-y-auto border border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold text-gray-600 dark:text-gray-400 mb-2 text-xs uppercase">Ubicaciones Registradas</h3>
                            <div className="space-y-3">
                                {Object.keys(stats.cellsByLeader || {}).map((leader) => (
                                    <div key={leader}>
                                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">{leader}</p>
                                        <ul className="text-xs text-gray-600 dark:text-gray-400 ml-2 space-y-1">
                                            {stats.cellsByLeader[leader].locations.map((loc, idx) => (
                                                <li key={idx} className="flex items-start gap-1">
                                                    <span className="text-red-500">•</span>
                                                    <span>{loc.address || 'Sin dirección'}, {loc.city || ''} <span className="text-gray-400">({loc.name})</span></span>
                                                    {loc.lat && loc.lng && (
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-500 hover:underline ml-2 font-semibold text-[10px]"
                                                            title={`GPS: ${loc.lat}, ${loc.lng}`}
                                                        >
                                                            [Ver Mapa]
                                                        </a>
                                                    )}
                                                </li>
                                            ))}
                                            {stats.cellsByLeader[leader].locations.length === 0 && <li className="text-gray-400 italic">Sin ubicaciones</li>}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Informacion Encuentros */}
                <div className="mb-10 page-break-inside-avoid">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <Award className="text-purple-600" /> Informacion Encuentros
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border dark:border-gray-700 rounded-lg overflow-hidden">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 uppercase">
                                <tr>
                                    <th className="p-3">Lider Doce</th>
                                    <th className="p-3">Célula</th>
                                    <th className="p-3 text-center">Inscritos</th>
                                    <th className="p-3 text-right">Recaudado</th>
                                    <th className="p-3 text-right">Saldo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 dark:text-gray-300">
                                {Object.keys(stats.encuentrosInfo || {}).map((leader) => (
                                    Object.keys(stats.encuentrosInfo[leader]).map((cell, idx) => {
                                        const data = stats.encuentrosInfo[leader][cell];
                                        return (
                                            <tr key={`${leader}-${cell}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                {idx === 0 && (
                                                    <td className="p-3 font-medium border-r dark:border-gray-700" rowSpan={Object.keys(stats.encuentrosInfo[leader]).length}>
                                                        {leader}
                                                    </td>
                                                )}
                                                <td className="p-3 text-gray-600 dark:text-gray-400">{cell}</td>
                                                <td className="p-3 text-center font-bold">{data.count}</td>
                                                <td className="p-3 text-right text-green-600 dark:text-green-400 font-medium">{formatCurrency(data.totalPaid)}</td>
                                                <td className="p-3 text-right text-red-500 dark:text-red-400 font-medium">{formatCurrency(data.balance)}</td>
                                            </tr>
                                        );
                                    })
                                ))}
                                {(!stats.encuentrosInfo || Object.keys(stats.encuentrosInfo).length === 0) && (
                                    <tr><td colSpan="5" className="p-4 text-center text-gray-400">Sin datos de encuentros</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 6. Informacion Convenciones */}
                <div className="mb-10 page-break-inside-avoid">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <Award className="text-pink-600" /> Informacion Convenciones
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border dark:border-gray-700 rounded-lg overflow-hidden">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 uppercase">
                                <tr>
                                    <th className="p-3">Lider Doce</th>
                                    <th className="p-3 text-center">Cant. Inscritos</th>
                                    <th className="p-3 text-right">Total Recaudado</th>
                                    <th className="p-3 text-right">Saldo Pendiente</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 dark:text-gray-300">
                                {Object.keys(stats.conventionsInfo || {}).map((leader) => {
                                    const data = stats.conventionsInfo[leader];
                                    return (
                                        <tr key={leader} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="p-3 font-medium">{leader}</td>
                                            <td className="p-3 text-center font-bold">{data.count}</td>
                                            <td className="p-3 text-right text-green-600 dark:text-green-400 font-medium">{formatCurrency(data.totalPaid)}</td>
                                            <td className="p-3 text-right text-red-500 dark:text-red-400 font-medium">{formatCurrency(data.balance)}</td>
                                        </tr>
                                    );
                                })}
                                {(!stats.conventionsInfo || Object.keys(stats.conventionsInfo).length === 0) && (
                                    <tr><td colSpan="4" className="p-4 text-center text-gray-400">Sin datos de convenciones</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>


                <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-400 print:fixed print:bottom-4 print:left-0 print:w-full">
                    <p>Generado por Ministerio Consolidación - {new Date().toLocaleDateString()}</p>
                </div>

                {/* Print Styles */}
                <style>
                    {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #printable-report, #printable-report * {
                            visibility: visible;
                        }
                        #printable-report {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            box-shadow: none;
                            padding: 0;
                            margin: 0;
                        }
                        .page-break-inside-avoid {
                            page-break-inside: avoid;
                        }
                    }
                `}
                </style>
            </div>
        </div>
    );
};

export default ConsolidatedStatsReport;
