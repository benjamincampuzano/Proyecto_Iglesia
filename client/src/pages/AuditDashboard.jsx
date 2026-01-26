import { useMemo, useState } from 'react';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, BarChart, Bar, Cell as ReCell, PieChart, Pie
} from 'recharts';
import {
    Activity, User, Calendar, Filter, Search, Download, Trash2,
    Edit, PlusCircle, LogIn, ChevronLeft, ChevronRight
} from 'lucide-react';
import useAuditDashboard from '../hooks/useAuditDashboard';
import DataTable from '../components/DataTable';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const AuditDashboard = () => {
    const { logs, stats, loading, pagination, filters, setFilters, handleFilterChange } = useAuditDashboard();
    const [selectedLog, setSelectedLog] = useState(null); // Modal state
    const memoizedStats = useMemo(() => stats, [stats]);

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
            'SESSION': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
            'GOAL': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            'ENCUENTRO_REGISTRATION': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
            'CONVENTION_REGISTRATION': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
            'ENCUENTRO_PAYMENT': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
            'CONVENTION_PAYMENT': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
            'ENCUENTRO_ATTENDANCE': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
        };
        return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    };

    const propertyMap = {
        'UserId': 'ID Usuario',
        'conventionId': 'ID Convención',
        'ConventionId': 'ID Convención',
        'encuentroId': 'ID Encuentro',
        'EncuentroId': 'ID Encuentro',
        'guestId': 'ID Invitado',
        'GuestId': 'ID Invitado',
        'name': 'Nombre',
        'fullName': 'Nombre Completo',
        'email': 'Email',
        'role': 'Rol',
        'phone': 'Teléfono',
        'address': 'Dirección',
        'city': 'Ciudad',
        'lastLogin': 'Último Acceso',
        'action': 'Acción',
        'cellId': 'ID Célula',
        'cellType': 'Tipo de Célula',
        'hostId': 'ID Anfitrión',
        'leaderId': 'ID Líder',
        'liderDoceId': 'ID Líder Doce',
        'liderCelulaId': 'ID Líder Célula',
        'pastorId': 'ID Pastor',
        'status': 'Estado',
        'Usuario': 'Participante',
        'Evento': 'Evento',
        'Invitado': 'Nombre del Invitado',
        'Encuentro': 'Nombre del Encuentro',
        'type': 'Tipo',
        'targetValue': 'Objetivo',
        'userId': 'ID Usuario',
        'responsable': 'Responsable',
        'amount': 'Monto',
        'registrationId': 'ID Registro',
        'classNumber': 'Clase Nº',
        'attended': 'Asistió'
    };

    const renderDetails = (detailsStr) => {
        if (!detailsStr) return '-';
        try {
            // Check if detailsStr is already an object (sometimes API might return parsed JSON)
            const details = typeof detailsStr === 'object' ? detailsStr : JSON.parse(detailsStr);

            if (details.targetUser) {
                return (
                    <span className="flex flex-col">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{details.targetUser}</span>
                        {details.changes && (
                            <span className="text-[10px] text-blue-500 font-medium uppercase tracking-tighter">
                                {Object.keys(details.changes).length} cambios registrados
                            </span>
                        )}
                    </span>
                );
            }
            // For registrations or creations that now have explicit Name/Event fields
            if (details.Usuario || details.Invitado) {
                return (
                    <span className="flex flex-col">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{details.Usuario || details.Invitado}</span>
                        <span className="text-[10px] text-blue-500 font-medium uppercase tracking-tighter">
                            {details.Evento || details.Encuentro}
                        </span>
                    </span>
                );
            }

            // Fallback for other objects: render a simple key-value summary or string
            return (
                <span className="flex flex-col gap-1">
                    {Object.entries(details).slice(0, 3).map(([key, val]) => (
                        <span key={key} className="text-xs text-gray-600 dark:text-gray-300">
                            <strong>{propertyMap[key] || key}:</strong> {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </span>
                    ))}
                </span>
            );

        } catch (e) {
            // If parsing fails or it's just a string, return as string
            return typeof detailsStr === 'string' ? detailsStr : JSON.stringify(detailsStr);
        }
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
            {memoizedStats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Inicios de Sesión (Últimos 30 días)</h3>
                        <div className="h-64 w-full min-h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={memoizedStats.loginsPerDay}>
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
                        <div className="h-64 w-full min-h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={memoizedStats.actionDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="action" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="_count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                        {memoizedStats.actionDistribution.map((entry, index) => (
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
                        <option value="GOAL">Metas</option>
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
            <DataTable
                columns={[
                    {
                        key: 'createdAt',
                        header: 'Fecha y Hora',
                        headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider',
                        cellClassName: 'px-6 py-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap',
                        render: (log) => formatDate(log.createdAt)
                    },
                    {
                        key: 'user',
                        header: 'Usuario',
                        headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider',
                        cellClassName: 'px-6 py-4',
                        render: (log) => (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                                    {log.user?.fullName.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-none">
                                        {log.user?.fullName || 'Sistema'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {Array.isArray(log.user?.roles) ? log.user.roles.join(', ').replace(/_/g, ' ') : log.user?.role}
                                    </p>
                                </div>
                            </div>
                        )
                    },
                    {
                        key: 'action',
                        header: 'Acción',
                        headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider',
                        cellClassName: 'px-6 py-4',
                        render: (log) => (
                            <div className="flex items-center gap-2 text-sm">
                                {getActionIcon(log.action)}
                                <span className="font-medium text-gray-700 dark:text-gray-200">{log.action}</span>
                            </div>
                        )
                    },
                    {
                        key: 'entityType',
                        header: 'Módulo',
                        headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider',
                        cellClassName: 'px-6 py-4',
                        render: (log) => (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEntityColor(log.entityType)}`}>
                                {log.entityType}
                            </span>
                        )
                    },
                    {
                        key: 'details',
                        header: 'Detalles',
                        headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider',
                        cellClassName: 'px-6 py-4 text-sm text-gray-500 dark:text-gray-400',
                        render: (log) => renderDetails(log.details)
                    },
                    {
                        key: 'actions',
                        header: 'Acciones',
                        headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right',
                        cellClassName: 'px-6 py-4 text-right',
                        render: (log) => (
                            <>
                                {log.details && (
                                    <button
                                        onClick={() => setSelectedLog(log)}
                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-semibold transition-colors"
                                    >
                                        Ver Detalles
                                    </button>
                                )}
                            </>
                        )
                    }
                ]}
                data={logs}
                loading={loading}
                skeletonRowCount={5}
                emptyMessage="No se encontraron registros."
                pagination={{
                    page: pagination.currentPage,
                    pages: pagination.pages,
                    onPrev: () => setFilters(f => ({ ...f, page: f.page - 1 })),
                    onNext: () => setFilters(f => ({ ...f, page: f.page + 1 })),
                }}
            />

            {/* Modal de Detalles */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                {getActionIcon(selectedLog.action)}
                                Detalle de la Actividad
                            </h2>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <ChevronRight className="rotate-90" size={20} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Fecha</p>
                                    <p className="text-sm dark:text-white">{formatDate(selectedLog.createdAt)}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Usuario</p>
                                    <p className="text-sm dark:text-white">{selectedLog.user?.fullName || 'Sistema'}</p>
                                </div>
                            </div>

                            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Información Detallada</h3>

                            {(() => {
                                try {
                                    const details = JSON.parse(selectedLog.details);

                                    // Case 1: Modification Log (Diff)
                                    if (details.changes) {
                                        return (
                                            <div className="space-y-4">
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Se realizaron cambios en el perfil de <span className="font-bold text-blue-600">{details.targetUser}</span>:
                                                </p>
                                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-gray-100 dark:bg-gray-800">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left">Campo</th>
                                                                <th className="px-4 py-2 text-left">Anterior</th>
                                                                <th className="px-4 py-2 text-left">Nuevo</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                            {Object.entries(details.changes).map(([field, values]) => (
                                                                <tr key={field} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                                    <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 capitalize">{field}</td>
                                                                    <td className="px-4 py-3 text-red-600 dark:text-red-400 line-through truncate max-w-[150px]">{values.old?.toString() || '(vacío)'}</td>
                                                                    <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium truncate max-w-[150px]">{values.new?.toString() || '(vacío)'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Case 2: Creation or other flat data log
                                    const isCreate = selectedLog.action === 'CREATE';
                                    return (
                                        <div className="space-y-4">
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {isCreate ? 'Información registrada en la creación:' : 'Detalles de la operación:'}
                                            </p>
                                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-100 dark:bg-gray-800">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left w-1/3">Propiedad</th>
                                                            <th className="px-4 py-2 text-left">Valor Registrado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                        {Object.entries(details).map(([key, value]) => {
                                                            // Skip targetUser if it's already in the header or just noise
                                                            if (key === 'targetUser' && isCreate) return null;
                                                            return (
                                                                <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                                    <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 capitalize">{propertyMap[key] || key}</td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                } catch (e) {
                                    return (
                                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                            <p className="text-sm dark:text-white">{selectedLog.details}</p>
                                        </div>
                                    );
                                }
                            })()}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditDashboard;
