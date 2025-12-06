
import { useState, useEffect } from 'react';
import { Calendar, Printer, TrendingUp, Users, BookOpen, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ConsolidatedStatsReport = ({ simpleMode = false }) => {
    const [stats, setStats] = useState(null);
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

            // Note: Ensure the API URL matches your server configuration
            // Using relative path or configured base URL is better practice
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

    if (!stats && loading) return <div className="text-center py-10">Cargando reporte...</div>;
    if (!stats) return <div className="text-center py-10">No hay datos disponibles</div>;

    // Data for charts
    const attendancePieData = [
        { name: 'Presentes', value: stats.churchAttendance.present },
        { name: 'Ausentes', value: stats.churchAttendance.absent },
    ];
    const COLORS = ['#10b981', '#ef4444'];

    return (
        <div className={`space-y-8 ${simpleMode ? 'p-0' : 'p-4'} print:p-0`}>
            {/* Header / Actions - Hidden when printing */}
            <div className={`flex flex-col ${simpleMode ? 'gap-2' : 'md:flex-row justify-between items-start md:items-center gap-4'} print:hidden`}>
                <div className={`flex ${simpleMode ? 'flex-col gap-2' : 'gap-4 items-center'} bg-white p-4 rounded-lg shadow w-full md:w-auto`}>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="border rounded px-2 py-1 text-sm w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="border rounded px-2 py-1 text-sm w-full"
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
            <div className={`bg-white rounded-lg shadow-lg ${simpleMode ? 'p-4' : 'p-8'} print:shadow-none print:p-0`} id="printable-report">

                {/* Report Header */}
                {!simpleMode && (
                    <div className="text-center border-b pb-6 mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Informe General de Consolidación</h1>
                        <p className="text-gray-500">
                            Período: {formatDate(stats.period.start)} - {formatDate(stats.period.end)}
                        </p>
                    </div>
                )}

                {/* Section 1: Executive Summary */}
                <div className="mb-10">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="text-blue-600" /> Resumen Ejecutivo
                    </h2>
                    <div className={`grid gap-6 ${simpleMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                        <div className="bg-blue-50 p-6 rounded-lg text-center border border-blue-100">
                            <p className="text-blue-600 font-medium mb-1">Total Miembros</p>
                            <p className="text-4xl font-bold text-blue-800">{stats.summary.totalMembers}</p>
                        </div>
                        <div className="bg-green-50 p-6 rounded-lg text-center border border-green-100">
                            <p className="text-green-600 font-medium mb-1">Estudiantes Activos</p>
                            <p className="text-4xl font-bold text-green-800">{stats.summary.activeStudents}</p>
                        </div>
                        <div className="bg-purple-50 p-6 rounded-lg text-center border border-purple-100">
                            <p className="text-purple-600 font-medium mb-1">Graduados en Período</p>
                            <p className="text-4xl font-bold text-purple-800">{stats.summary.graduatedInPeriod}</p>
                        </div>
                    </div>
                </div>

                {/* Section 2: Church Attendance */}
                <div className="mb-10">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Users className="text-blue-600" /> Asistencia a la Iglesia
                    </h2>

                    <div className={`grid gap-8 items-center ${simpleMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                        <div>
                            <table className="w-full text-sm text-left">
                                <tbody className="divide-y divide-gray-100">
                                    <tr className="bg-gray-50">
                                        <td className="p-3 font-medium">Asistencia Promedio</td>
                                        <td className="p-3 text-right font-bold">{stats.churchAttendance.rate}%</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3">Total Registros Evaluados</td>
                                        <td className="p-3 text-right">{stats.churchAttendance.totalRecords}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 text-green-600">Total Asistencias</td>
                                        <td className="p-3 text-right font-medium">{stats.churchAttendance.present}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 text-red-600">Total Ausencias</td>
                                        <td className="p-3 text-right font-medium">{stats.churchAttendance.absent}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="h-64 flex justify-center items-center">
                            {stats.churchAttendance.totalRecords > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={attendancePieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {attendancePieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-gray-400 italic">Sin datos suficientes para gráfica</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 3: Seminars & Consolidation */}
                <div className="mb-6 page-break-inside-avoid">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <BookOpen className="text-blue-600" /> Seminarios y Consolidación
                    </h2>
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                        <p className="text-gray-600 mb-4">
                            Detalles del proceso de consolidación para el período seleccionado.
                        </p>
                        <div className={`grid gap-4 text-center ${simpleMode ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Nuevos Inscritos</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">-</p> {/* Placeholder for now if backend doesn't send it */}
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Tasa de Finalización</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">-</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Clases Impartidas</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">-</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Retención Global</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">-</p>
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-center text-gray-400 italic">
                            * Datos detallados de seminarios en desarrollo
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-400 print:fixed print:bottom-4 print:left-0 print:w-full">
                    <p>Generado por Sistema de Gestión Eclesiástica - {new Date().toLocaleDateString()}</p>
                </div>
            </div>

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
    );
};

export default ConsolidatedStatsReport;
