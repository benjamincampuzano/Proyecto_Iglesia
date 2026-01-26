import React, { useState, useMemo } from 'react';
import { Download, Filter, DollarSign, Users, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BalanceReport = ({ data, title }) => {
    const { user } = useAuth();
    const [filterPastor, setFilterPastor] = useState('');
    const [filterDoce, setFilterDoce] = useState('');
    const [filterCelula, setFilterCelula] = useState('');

    // Extract unique filter options
    const pastors = useMemo(() => [...new Set(data.map(item => item.pastorName).filter(n => n !== 'N/A'))].sort(), [data]);
    const doces = useMemo(() => [...new Set(data.map(item => item.liderDoceName).filter(n => n !== 'N/A'))].sort(), [data]);
    const celulas = useMemo(() => [...new Set(data.map(item => item.liderCelulaName).filter(n => n !== 'N/A'))].sort(), [data]);

    // Apply filters
    const filteredData = useMemo(() => {
        return data.filter(item => {
            return (
                (filterPastor === '' || item.pastorName === filterPastor) &&
                (filterDoce === '' || item.liderDoceName === filterDoce) &&
                (filterCelula === '' || item.liderCelulaName === filterCelula)
            );
        });
    }, [data, filterPastor, filterDoce, filterCelula]);

    // Calculate totals
    const totals = useMemo(() => {
        return filteredData.reduce((acc, curr) => ({
            cost: acc.cost + curr.cost,
            paid: acc.paid + curr.paid,
            balance: acc.balance + curr.balance
        }), { cost: 0, paid: 0, balance: 0 });
    }, [filteredData]);

    // Export to CSV
    const handleExport = () => {
        const headers = ['Nombre', 'Rol', 'Pastor', 'Líder 12', 'Líder Célula', 'Costo Final', 'Pagado', 'Saldo Pendiente'];

        const csvContent = [
            headers.join(','),
            ...filteredData.map(row => [
                `"${row.userName || row.guestName || ''}"`,
                `"${row.userRole || row.status || ''}"`,
                `"${row.pastorName}"`,
                `"${row.liderDoceName}"`,
                `"${row.liderCelulaName}"`,
                row.cost.toFixed(2),
                row.paid.toFixed(2),
                row.balance.toFixed(2)
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Reporte_Financiero.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4 text-gray-700 dark:text-gray-300 font-medium">
                    <Filter size={20} />
                    <span>Filtros de Jerarquía</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                        value={filterPastor}
                        onChange={(e) => setFilterPastor(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                    >
                        <option value="">Todos los Pastores</option>
                        {pastors.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>

                    <select
                        value={filterDoce}
                        onChange={(e) => setFilterDoce(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                    >
                        <option value="">Todos los Líderes de 12</option>
                        {doces.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>

                    <select
                        value={filterCelula}
                        onChange={(e) => setFilterCelula(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                    >
                        <option value="">Todos los Líderes de Célula</option>
                        {celulas.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Esperado</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                                ${totals.cost.toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Recaudado</p>
                            <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                                ${totals.paid.toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Saldo Pendiente</p>
                            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                                ${totals.balance.toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <DollarSign className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Header & Export */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users size={20} />
                    Detalle de Inscritos ({filteredData.length})
                </h3>
                {user?.roles?.some(role => ['ADMIN', 'LIDER_DOCE'].includes(role)) && (
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                        <Download size={18} />
                        Exportar Excel
                    </button>
                )}
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre / Rol</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Jerarquía</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costo Final</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pagado</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {item.userName || item.guestName}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {item.userRole || item.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-gray-600 dark:text-gray-300">
                                            <span className="font-semibold">12:</span> {item.liderDoceName}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            <span className="font-semibold">Célula:</span> {item.liderCelulaName}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                                        ${item.cost.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-green-600 dark:text-green-400 font-medium">
                                        ${item.paid.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${item.balance > 0
                                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                            : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                            }`}>
                                            ${item.balance.toLocaleString()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No se encontraron registros con los filtros seleccionados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BalanceReport;
