import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from "../../context/AuthContext";
import * as XLSX from 'xlsx';
import { Download, Users, BookOpen, UserCheck, TrendingUp } from 'lucide-react';

const SchoolLeaderStats = () => {
    const { user, hasAnyRole } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await api.get('/school/stats/leader');
            setData(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching stats:', error);
            setLoading(false);
        }
    };

    const downloadExcel = () => {
        const ws = XLSX.utils.json_to_sheet(data.map(item => ({
            'Líder 12': item.leaderName,
            'Total Estudiantes': item.students,
            'Promedio Notas': item.avgGrade,
            'Asistencia Promedio (%)': item.avgAttendance,
            'Aprobados': item.passed
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Estadísticas Escuela");
        XLSX.writeFile(wb, "Reporte_Escuela_Lideres.xlsx");
    };

    if (loading) return <div className="text-center py-10">Cargando reporte...</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Reporte Estadístico por Líder</h2>
                    <p className="text-gray-500 dark:text-gray-400">Desempeño de estudiantes agrupado por Líder de 12</p>
                </div>
                {hasAnyRole(['ADMIN', 'LIDER_DOCE']) && (
                    <button
                        onClick={downloadExcel}
                        className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition-all"
                    >
                        <Download size={18} className="mr-2" />
                        Exportar Excel
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-blue-500 flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 mr-4">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Estudiantes</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white">
                            {data.reduce((acc, curr) => acc + curr.students, 0)}
                        </p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-purple-500 flex items-center">
                    <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 mr-4">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Promedio General</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white">
                            {(data.reduce((acc, curr) => acc + parseFloat(curr.avgGrade), 0) / (data.length || 1)).toFixed(1)}
                        </p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-green-500 flex items-center">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 mr-4">
                        <UserCheck size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Aprobados</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white">
                            {data.reduce((acc, curr) => acc + curr.passed, 0)}
                        </p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-yellow-500 flex items-center">
                    <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 mr-4">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">% Asistencia Global</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white">
                            {(data.reduce((acc, curr) => acc + parseFloat(curr.avgAttendance), 0) / (data.length || 1)).toFixed(1)}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-white">Estudiantes y Aprobados por Líder</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="leaderName"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                interval={0}
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', color: '#fff', border: 'none' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar dataKey="students" name="Estudiantes" fill="#8884d8" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="passed" name="Aprobados" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Detalle por Red</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Líder 12</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Estudiantes</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Promedio Notas</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Asistencia Promedio</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aprobados</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {data.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {item.leaderName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-center">
                                        {item.students}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${parseFloat(item.avgGrade) >= 4.0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                            parseFloat(item.avgGrade) >= 3.0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                            }`}>
                                            {item.avgGrade}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-center">
                                        {item.avgAttendance}%
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-center">
                                        {item.passed}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SchoolLeaderStats;
