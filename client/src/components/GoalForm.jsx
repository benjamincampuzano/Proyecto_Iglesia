import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const GoalForm = ({ isOpen, onClose, onSuccess, initialData = null }) => {
    const { hasAnyRole } = useAuth();
    const [formData, setFormData] = useState({
        type: 'ENCUENTRO_REGISTRATIONS',
        targetValue: '',
        encuentroId: '',
        conventionId: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        userId: ''
    });

    const [encuentros, setEncuentros] = useState([]);
    const [convenciones, setConvenciones] = useState([]);
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState('');

    const isPastorOrAdmin = hasAnyRole(['ADMIN', 'PASTOR']);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                targetValue: (initialData.targetValue ?? '').toString(),
                encuentroId: (initialData.encuentroId ?? '').toString(),
                conventionId: (initialData.conventionId ?? '').toString(),
                userId: (initialData.userId ?? '').toString(),
                month: initialData.month || new Date().getMonth() + 1,
                year: initialData.year || new Date().getFullYear(),
                type: initialData.type || 'ENCUENTRO_REGISTRATIONS'
            });
        }
    }, [initialData]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setFetching(true);
                const [encRes, convRes, leadRes] = await Promise.all([
                    api.get('/encuentros'),
                    api.get('/convenciones'),
                    api.get('/users?role=LIDER_DOCE')
                ]);

                setEncuentros(encRes.data);
                setConvenciones(convRes.data);
                setLeaders(leadRes.data);
            } catch (err) {
                console.error('Error fetching form data:', err);
                setError('Error al cargar la información necesaria para el formulario');
                // Ensure arrays are initialized even on error
                setEncuentros([]);
                setConvenciones([]);
                setLeaders([]);
            } finally {
                setFetching(false);
            }
        };

        if (isOpen) fetchData();
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation: userId is mandatory
        if (!formData.userId) {
            setError('Por favor seleccione un Líder Responsable (Líder 12)');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let response;
            if (initialData && initialData.id) {
                response = await api.put(`/metas/${initialData.id}`, formData);
            } else {
                response = await api.post('/metas', formData);
            }

            if (response.status !== 200 && response.status !== 201) throw new Error('Error al guardar la meta');

            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">
                        {initialData ? 'Editar Meta' : 'Nueva Meta'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400">
                            <AlertCircle size={20} />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Tipo de Meta</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                            disabled={fetching}
                        >
                            <option value="ENCUENTRO_REGISTRATIONS">Encuentro: Inscritos</option>
                            <option value="ENCUENTRO_CONVERSIONS">Encuentro: Conversiones</option>
                            <option value="CONVENTION_REGISTRATIONS">Convención: Inscritos</option>
                            <option value="CELL_COUNT">Células: Cantidad</option>
                            <option value="CELL_ATTENDANCE">Células: Asistencia</option>
                        </select>
                    </div>

                    {formData.type.includes('ENCUENTRO') && (
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Seleccionar Encuentro</label>
                            <select
                                value={formData.encuentroId}
                                onChange={(e) => setFormData({ ...formData, encuentroId: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                required
                            >
                                <option value="">Seleccione...</option>
                                {encuentros.map(e => (
                                    <option key={e.id} value={e.id}>{e.name} ({new Date(e.startDate).getFullYear()})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {formData.type.includes('CONVENTION') && (
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Seleccionar Convención</label>
                            <select
                                value={formData.conventionId}
                                onChange={(e) => setFormData({ ...formData, conventionId: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                required
                            >
                                <option value="">Seleccione...</option>
                                {convenciones.map(c => (
                                    <option key={c.id} value={c.id}>{c.theme} ({c.year})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {formData.type.includes('CELL') && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Mes</label>
                                <input
                                    type="number"
                                    min="1" max="12"
                                    value={formData.month}
                                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Año</label>
                                <input
                                    type="number"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {isPastorOrAdmin && (
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest font-black text-gray-400 text-blue-500">Líder Responsable (Líder 12) *</label>
                            <select
                                value={formData.userId}
                                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                required
                            >
                                <option value="">Seleccione un Líder...</option>
                                {leaders.map(l => (
                                    <option key={l.id} value={l.id}>{l.fullName || l.profile?.fullName || 'Sin Nombre'}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-gray-500 px-1">La meta se calculará basándose en la red de este Líder 12.</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Valor Objetivo</label>
                        <input
                            type="number"
                            value={formData.targetValue}
                            onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-medium text-xl font-bold"
                            placeholder="Ej: 100"
                            required
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading || fetching}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            {loading || fetching ? (
                                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Save size={20} />
                                    {initialData ? 'Actualizar Meta' : 'Establecer Objetivo'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GoalForm;

