import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Calendar, Users, DollarSign, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EncuentroDetails from '../components/EncuentroDetails';

const Encuentros = () => {
    const { user } = useAuth();
    const [encuentros, setEncuentros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEncuentro, setSelectedEncuentro] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        type: 'HOMBRES',
        name: '',
        description: '',
        cost: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchEncuentros();
    }, []);

    const fetchEncuentros = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/encuentros', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEncuentros(res.data);
        } catch (error) {
            console.error('Error fetching encuentros:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEncuentroDetails = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5000/api/encuentros/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedEncuentro(res.data);
        } catch (error) {
            console.error('Error fetching details:', error);
            alert('Error loading details');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/encuentros', {
                ...formData,
                cost: parseFloat(formData.cost)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowCreateModal(false);
            fetchEncuentros();
            setFormData({
                type: 'HOMBRES',
                name: '',
                description: '',
                cost: '',
                startDate: '',
                endDate: ''
            });
        } catch (error) {
            console.error('Error creating:', error);
            alert('Error creating encuentro');
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('¿Eliminar este encuentro y todos sus datos?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/encuentros/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchEncuentros();
        } catch (error) {
            console.error(error);
            alert('Error deleting');
        }
    };

    if (selectedEncuentro) {
        return (
            <EncuentroDetails
                encuentro={selectedEncuentro}
                onBack={() => setSelectedEncuentro(null)}
                onRefresh={() => fetchEncuentroDetails(selectedEncuentro.id)}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Encuentros
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Gestión de Encuentros (Pre y Pos encuentros)
                    </p>
                </div>
                {user.role === 'SUPER_ADMIN' && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-lg shadow-purple-500/30"
                    >
                        <Plus size={20} className="mr-2" />
                        Nuevo Encuentro
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {encuentros.map((enc) => (
                        <div
                            key={enc.id}
                            onClick={() => fetchEncuentroDetails(enc.id)}
                            className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 cursor-pointer overflow-hidden relative"
                        >
                            <div className="absolute top-0 left-0 w-2 h-full bg-purple-500 group-hover:bg-pink-500 transition-colors"></div>

                            <div className="p-6 pl-8">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold tracking-wider text-purple-600 dark:text-purple-400 uppercase">
                                        {enc.type}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        {user.role === 'SUPER_ADMIN' && (
                                            <button
                                                onClick={(e) => handleDelete(e, enc.id)}
                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors z-10"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 transition-colors">
                                    {enc.name}
                                </h3>

                                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
                                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                        <Calendar size={16} className="mr-2 text-purple-500" />
                                        {new Date(enc.startDate).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                        <Users size={16} className="mr-2 text-blue-500" />
                                        {enc._count?.registrations || 0} Inscritos
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {encuentros.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            No hay encuentros activos.<br />
                            ¡Crea un nuevo encuentro para comenzar!
                        </div>
                    )}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nuevo Encuentro</h3>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Evento</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="HOMBRES">HOMBRES</option>
                                        <option value="MUJERES">MUJERES</option>
                                        <option value="JOVENES">JOVENES</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo ($)</label>
                                    <input
                                        type="number"
                                        value={formData.cost}
                                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Fin</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
                                >
                                    Crear Encuentro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Encuentros;
