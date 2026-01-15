import { useState, useEffect } from 'react';
import { Phone, Home, User, MessageSquare, AlertCircle, Plus, History, X, Clock, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const GuestTracking = () => {
    const { user } = useAuth();
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedGuest, setSelectedGuest] = useState(null);
    const [modalType, setModalType] = useState(null); // 'call', 'visit', 'history'
    const [formData, setFormData] = useState({
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        observation: ''
    });

    useEffect(() => {
        fetchGuests();
    }, []);

    const fetchGuests = async () => {
        try {
            setLoading(true);
            const response = await api.get('/guests');
            setGuests(response.data.guests || []);
        } catch (error) {
            console.error('Error fetching guests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (guest, type) => {
        setSelectedGuest(guest);
        setModalType(type);
        setFormData({
            date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
            observation: ''
        });
    };

    const handleAction = async () => {
        if (!formData.observation.trim()) {
            alert('La observación es obligatoria');
            return;
        }

        try {
            const endpoint = modalType === 'call' ? 'calls' : 'visits';
            await api.post(`/guests/${selectedGuest.id}/${endpoint}`, formData);
            setModalType(null);
            fetchGuests();
        } catch (error) {
            console.error(`Error saving ${modalType}:`, error);
            alert('Error al guardar: ' + (error.response?.data?.message || error.message));
        }
    };

    const getAlerts = (guest) => {
        const createdAt = new Date(guest.createdAt);
        const now = new Date();
        const diffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
        const hasCalls = guest.calls && guest.calls.length > 0;
        const hasVisits = guest.visits && guest.visits.length > 0;
        const alerts = [];

        if (diffDays >= 4 && !hasCalls) {
            alerts.push({ type: 'call', message: 'Llamada pendiente (4+ días)' });
        }
        if (diffDays >= 6 && !hasVisits) {
            alerts.push({ type: 'visit', message: 'Visita pendiente (6+ días)' });
        }

        return alerts;
    };

    if (loading) {
        return <div className="text-center py-8">Cargando invitados...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invitado</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contacto / Dirección</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quién Invitó / Petición</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Llamada</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Visita</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {guests.map((guest) => {
                                const alerts = getAlerts(guest);
                                const callCount = guest.calls?.length || 0;
                                const visitCount = guest.visits?.length || 0;
                                const lastCall = guest.calls?.[0];
                                const lastVisit = guest.visits?.[0];

                                return (
                                    <tr key={guest.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{guest.name}</div>
                                            <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-semibold">
                                                <span className={`px-1.5 py-0.5 rounded-full ${guest.status === 'GANADO' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                                                    guest.status === 'CONSOLIDADO' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' :
                                                        guest.status === 'CONTACTADO' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30' :
                                                            'bg-gray-100 text-gray-600 dark:bg-gray-700'
                                                    }`}>
                                                    {guest.status === 'GANADO' ? 'Consolidado' :
                                                        guest.status === 'CONSOLIDADO' ? 'Visitado' :
                                                            guest.status === 'CONTACTADO' ? 'Llamado' :
                                                                guest.status}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {alerts.map((alert, idx) => (
                                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                        <AlertCircle className="w-3 h-3 mr-1" />
                                                        {alert.message}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                                {guest.phone}
                                            </div>
                                            <div className="flex items-center mt-1 text-sm text-gray-600 dark:text-gray-300">
                                                <Home className="w-4 h-4 mr-2 text-gray-400" />
                                                {guest.address || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                                <User className="w-4 h-4 mr-2 text-gray-400" />
                                                {guest.invitedBy?.fullName}
                                            </div>
                                            <div className="flex items-start mt-1 text-sm text-gray-500 dark:text-gray-400 italic">
                                                <MessageSquare className="w-4 h-4 mr-2 mt-0.5 text-gray-400" />
                                                {guest.prayerRequest || 'Sin petición'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${callCount > 0
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                                                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                                                        }`}>
                                                        {callCount}
                                                    </span>
                                                    <button
                                                        onClick={() => handleOpenModal(guest, 'call')}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-blue-600 transition-colors"
                                                        title="Agregar llamada"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {lastCall && (
                                                    <p className="text-[10px] text-gray-500 truncate max-w-[100px]" title={lastCall.observation}>
                                                        {lastCall.observation}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${visitCount > 0
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                                                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                                                        }`}>
                                                        {visitCount}
                                                    </span>
                                                    <button
                                                        onClick={() => handleOpenModal(guest, 'visit')}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-blue-600 transition-colors"
                                                        title="Agregar visita"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {lastVisit && (
                                                    <p className="text-[10px] text-gray-500 truncate max-w-[100px]" title={lastVisit.observation}>
                                                        {lastVisit.observation}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleOpenModal(guest, 'history')}
                                                className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                title="Ver historial"
                                            >
                                                <History className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Action Modal (Call or Visit) */}
            {(modalType === 'call' || modalType === 'visit') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {modalType === 'call' ? 'Registrar Llamada' : 'Registrar Visita'}
                            </h3>
                            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha y Hora</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="datetime-local"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Observación (Obligatoria)</label>
                                <textarea
                                    value={formData.observation}
                                    onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white resize-none"
                                    placeholder="Escribe lo que sucedió durante el contacto..."
                                    rows="4"
                                    required
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setModalType(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAction}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Guardar Registro
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {modalType === 'history' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white font-outfit">Historial de Seguimiento</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Invitado: {selectedGuest?.name}</p>
                            </div>
                            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Calls History */}
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                                    <Phone className="w-4 h-4 text-green-500" />
                                    Llamadas Realizadas ({selectedGuest.calls?.length || 0})
                                </h4>
                                <div className="space-y-4">
                                    {selectedGuest.calls?.length > 0 ? (
                                        selectedGuest.calls.map((call, idx) => (
                                            <div key={idx} className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                                                        {format(new Date(call.date), "PPP p", { locale: es })}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 uppercase font-semibold">
                                                        Por: {call.caller?.fullName}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                                                    "{call.observation}"
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                            No hay registros de llamadas.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Visits History */}
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                                    <Home className="w-4 h-4 text-blue-500" />
                                    Visitas Realizadas ({selectedGuest.visits?.length || 0})
                                </h4>
                                <div className="space-y-4">
                                    {selectedGuest.visits?.length > 0 ? (
                                        selectedGuest.visits.map((visit, idx) => (
                                            <div key={idx} className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                                                        {format(new Date(visit.date), "PPP p", { locale: es })}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 uppercase font-semibold">
                                                        Por: {visit.visitor?.fullName}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                                                    "{visit.observation}"
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                            No hay registros de visitas.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                            <button
                                onClick={() => setModalType(null)}
                                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg active:scale-95"
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

export default GuestTracking;
