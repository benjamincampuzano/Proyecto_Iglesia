import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Calendar, Users, DollarSign, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ConventionDetails from '../components/ConventionDetails';

const Convenciones = () => {
    const { user, hasAnyRole } = useAuth();
    const [conventions, setConventions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedConvention, setSelectedConvention] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Create Form State
    const [formData, setFormData] = useState({
        type: 'FAMILIAS',
        year: new Date().getFullYear(),
        theme: '',
        cost: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchConventions();
    }, []);

    const fetchConventions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/convenciones');
            setConventions(res.data);
        } catch (error) {
            console.error('Error fetching conventions:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchConventionDetails = async (id) => {
        try {
            const res = await api.get(`/convenciones/${id}`);
            setSelectedConvention(res.data);
        } catch (error) {
            console.error('Error fetching convention details:', error);
            alert('Error loading details');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/convenciones', {
                ...formData,
                cost: parseFloat(formData.cost)
            });
            setShowCreateModal(false);
            fetchConventions();
            // Reset form
            setFormData({
                type: 'FAMILIAS',
                year: new Date().getFullYear(),
                theme: '',
                cost: '',
                startDate: '',
                endDate: ''
            });
        } catch (error) {
            console.error('Error creating convention:', error);
            alert('Error creating convention: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation(); // Prevent card click
        if (!window.confirm('¿Estás seguro de eliminar esta convención? Se eliminarán todos los registros y pagos asociados.')) {
            return;
        }
        try {
            await api.delete(`/convenciones/${id}`);
            fetchConventions();
        } catch (error) {
            console.error('Error deleting convention:', error);
            alert('Error deleting convention');
        }
    };

    if (selectedConvention) {
        return (
            <ConventionDetails
                convention={selectedConvention}
                onBack={() => setSelectedConvention(null)}
                onRefresh={() => fetchConventionDetails(selectedConvention.id)}
            />
        );
    }

    const canModify = hasAnyRole(['SUPER_ADMIN', 'PASTOR', 'LIDER_DOCE']);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Convenciones
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Seguimiento de Convenciones anuales
                    </p>
                </div>
                {canModify && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/30"
                    >
                        <Plus size={20} className="mr-2" />
                        Nueva Convención
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {conventions.map((conv) => (
                        <div
                            key={conv.id}
                            onClick={() => fetchConventionDetails(conv.id)}
                            className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 cursor-pointer overflow-hidden relative"
                        >
                            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500 group-hover:bg-indigo-500 transition-colors"></div>
                            <div className="p-6 pl-8">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {conv.type}
                                        </h3>
                                        <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded mt-1">
                                            {conv.year}
                                        </span>
                                    </div>
                                    <ChevronRight className="text-gray-400 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" size={24} />
                                </div>

                                <div className="absolute top-4 right-12 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {canModify && (
                                        <button
                                            onClick={(e) => handleDelete(e, conv.id)}
                                            className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                                            title="Eliminar Convención"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                {conv.theme && (
                                    <p className="text-gray-600 dark:text-gray-300 italic mb-4 line-clamp-2">
                                        "{conv.theme}"
                                    </p>
                                )}

                                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                        <Calendar size={16} className="mr-2 text-blue-500" />
                                        {new Date(conv.startDate).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                        <Users size={16} className="mr-2 text-green-500" />
                                        {conv.stats?.registeredCount || 0} Inscritos
                                    </div>
                                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                        <DollarSign size={16} className="mr-2 text-orange-500" />
                                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(conv.cost)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {conventions.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            No hay convenciones creadas.<br />
                            ¡Crea una nueva convención para comenzar!
                        </div>
                    )}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nueva Convención</h3>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="FAMILIAS">FAMILIAS</option>
                                        <option value="MUJERES">MUJERES</option>
                                        <option value="JOVENES">JOVENES</option>
                                        <option value="HOMBRES">HOMBRES</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Año</label>
                                    <input
                                        type="number"
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lema / Tema</label>
                                <input
                                    type="text"
                                    value={formData.theme}
                                    onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ej: Levántate y Resplandece"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo Total ($)</label>
                                <input
                                    type="number"
                                    value={formData.cost}
                                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Fin</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Crear Convención
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Convenciones;
