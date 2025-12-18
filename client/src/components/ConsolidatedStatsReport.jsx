import { useState, useEffect } from 'react';
import { Calendar, Printer, TrendingUp, Users, BookOpen, MapPin, Award, Lock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAuth } from '../context/AuthContext';

const ConsolidatedStatsReport = ({ simpleMode = false }) => {
    const { user } = useAuth();
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
    const ALLOWED_ROLES = ['PASTOR', 'LIDER_DOCE', 'SUPER_ADMIN'];
    const hasAccess = user && ALLOWED_ROLES.includes(user.role);

    useEffect(() => {
        if (hasAccess) {
            fetchStats();
        }
    }, [startDate, endDate, hasAccess]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                startDate,
                endDate
            });

            const response = await fetch(`http://localhost:5000/api/consolidar/stats/general?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setStats(data);
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
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow text-center">
                <div className="bg-red-100 p-4 rounded-full mb-4">
                    <Lock className="w-12 h-12 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Acceso Restringido</h2>
                <p className="text-gray-600 max-w-md">
                    Este informe solo está disponible para usuarios con perfil de <strong>Pastor</strong> o <strong>Líder de 12</strong>.
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
            {/* Header / Actions - Simplified without Date Inputs */}
            <div className={`flex flex-col ${simpleMode ? 'gap-2' : 'md:flex-row justify-end items-center gap-4'} print:hidden`}>
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
            <div className={`bg-white rounded-lg shadow-lg ${simpleMode ? 'p-4' : 'p-8'} print:shadow-none print:p-0`} id="printable-report">

                {/* Report Header */}
                {!simpleMode && (
                    <div className="text-center border-b pb-6 mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Informe General</h1>
                        <p className="text-gray-500">
                            Reporte Histórico General
                        </p>
                    </div>
                )}

                {/* 1. Guests by Leader (Doce) */}
                <div className="mb-10 page-break-inside-avoid">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Users className="text-blue-600" /> Personas Invitadas por Lider Doce
                    </h2>
                    <div className="h-64 w-full">
                        {guestsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={guestsData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Invitados" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="text-gray-400 italic text-center pt-10">No hay datos de invitados en este período.</p>}
                    </div>
                </div>

                {/* 2. Church Attendance by Month (Grouped by Leader) */}
                <div className="mb-10 page-break-inside-avoid">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="text-green-600" /> Asistencia a la Iglesia (Mensual por Lider Doce)
                    </h2>
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
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <BookOpen className="text-indigo-600" /> Rendimiento Académico (Por Clase)
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border rounded-lg overflow-hidden">
                            <thead className="bg-gray-50 text-gray-700 uppercase">
                                <tr>
                                    <th className="p-3">Clase / Módulo</th>
                                    <th className="p-3 text-center">Cantidad Estudiantes</th>
                                    <th className="p-3 text-center">Promedio Notas</th>
                                    <th className="p-3 text-center">Asistencia Promedio</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {stats.studentStats && stats.studentStats.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
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
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <MapPin className="text-red-600" /> Células y Ubicación
                    </h2>

                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                        {/* Stats Table */}
                        <div>
                            <table className="w-full text-sm text-left border rounded-lg">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="p-2">Lider Doce</th>
                                        <th className="p-2 text-center">Cant. Células</th>
                                        <th className="p-2 text-center">Asistencia Prom.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
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
                        <div className="bg-gray-50 p-4 rounded-lg h-60 overflow-y-auto border border-gray-200">
                            <h3 className="font-semibold text-gray-600 mb-2 text-xs uppercase">Ubicaciones Registradas</h3>
                            <div className="space-y-3">
                                {Object.keys(stats.cellsByLeader || {}).map((leader) => (
                                    <div key={leader}>
                                        <p className="text-xs font-bold text-blue-600 mb-1">{leader}</p>
                                        <ul className="text-xs text-gray-600 ml-2 space-y-1">
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
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Award className="text-purple-600" /> Informacion Encuentros
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border rounded-lg overflow-hidden">
                            <thead className="bg-gray-50 text-gray-700 uppercase">
                                <tr>
                                    <th className="p-3">Lider Doce</th>
                                    <th className="p-3">Célula</th>
                                    <th className="p-3 text-center">Inscritos</th>
                                    <th className="p-3 text-right">Recaudado</th>
                                    <th className="p-3 text-right">Saldo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {Object.keys(stats.encuentrosInfo || {}).map((leader) => (
                                    Object.keys(stats.encuentrosInfo[leader]).map((cell, idx) => {
                                        const data = stats.encuentrosInfo[leader][cell];
                                        return (
                                            <tr key={`${leader}-${cell}`} className="hover:bg-gray-50">
                                                {idx === 0 && (
                                                    <td className="p-3 font-medium border-r" rowSpan={Object.keys(stats.encuentrosInfo[leader]).length}>
                                                        {leader}
                                                    </td>
                                                )}
                                                <td className="p-3 text-gray-600">{cell}</td>
                                                <td className="p-3 text-center font-bold">{data.count}</td>
                                                <td className="p-3 text-right text-green-600 font-medium">{formatCurrency(data.totalPaid)}</td>
                                                <td className="p-3 text-right text-red-500 font-medium">{formatCurrency(data.balance)}</td>
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
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Award className="text-pink-600" /> Informacion Convenciones
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border rounded-lg overflow-hidden">
                            <thead className="bg-gray-50 text-gray-700 uppercase">
                                <tr>
                                    <th className="p-3">Lider Doce</th>
                                    <th className="p-3 text-center">Cant. Inscritos</th>
                                    <th className="p-3 text-right">Total Recaudado</th>
                                    <th className="p-3 text-right">Saldo Pendiente</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {Object.keys(stats.conventionsInfo || {}).map((leader) => {
                                    const data = stats.conventionsInfo[leader];
                                    return (
                                        <tr key={leader} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium">{leader}</td>
                                            <td className="p-3 text-center font-bold">{data.count}</td>
                                            <td className="p-3 text-right text-green-600 font-medium">{formatCurrency(data.totalPaid)}</td>
                                            <td className="p-3 text-right text-red-500 font-medium">{formatCurrency(data.balance)}</td>
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
