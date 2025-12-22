import { useState, useEffect } from 'react';
import { Phone, Home, User, MessageSquare, AlertCircle, Edit2, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const GuestTracking = () => {
    const { user } = useAuth();
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedGuest, setSelectedGuest] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editData, setEditData] = useState({
        called: false,
        callObservation: '',
        visited: false,
        visitObservation: ''
    });

    useEffect(() => {
        fetchGuests();
    }, []);

    const fetchGuests = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/guests', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setGuests(data.guests || []);
        } catch (error) {
            console.error('Error fetching guests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (guest) => {
        setSelectedGuest(guest);
        setEditData({
            called: guest.called || false,
            callObservation: guest.callObservation || '',
            visited: guest.visited || false,
            visitObservation: guest.visitObservation || ''
        });
        setIsModalOpen(true);
    };

    const handleUpdate = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/guests/${selectedGuest.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editData)
            });

            if (response.ok) {
                setIsModalOpen(false);
                fetchGuests();
            } else {
                alert('Error al actualizar el seguimiento');
            }
        } catch (error) {
            console.error('Error updating guest tracking:', error);
            alert('Error al conectar con el servidor');
        }
    };

    const getAlerts = (guest) => {
        const createdAt = new Date(guest.createdAt);
        const now = new Date();
        const diffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
        const alerts = [];

        if (diffDays >= 4 && !guest.called) {
            alerts.push({ type: 'call', message: 'Llamada pendiente (4+ días)' });
        }
        if (diffDays >= 6 && !guest.visited) {
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
                                return (
                                    <tr key={guest.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{guest.name}</div>
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
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${guest.called
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                {guest.called ? 'Sí' : 'No'}
                                            </span>
                                            {guest.callObservation && (
                                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]" title={guest.callObservation}>
                                                    {guest.callObservation}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${guest.visited
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                {guest.visited ? 'Sí' : 'No'}
                                            </span>
                                            {guest.visitObservation && (
                                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]" title={guest.visitObservation}>
                                                    {guest.visitObservation}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleEdit(guest)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Actualizar seguimiento"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Seguimiento: {selectedGuest?.name}</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Call Section */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={editData.called}
                                        onChange={(e) => setEditData({ ...editData, called: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Realizó la llamada?</span>
                                </label>
                                <textarea
                                    value={editData.callObservation}
                                    onChange={(e) => setEditData({ ...editData, callObservation: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                                    placeholder="Observación de la llamada..."
                                    rows="2"
                                />
                            </div>

                            {/* Visit Section */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={editData.visited}
                                        onChange={(e) => setEditData({ ...editData, visited: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Realizó la visita?</span>
                                </label>
                                <textarea
                                    value={editData.visitObservation}
                                    onChange={(e) => setEditData({ ...editData, visitObservation: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                                    placeholder="Observación de la visita..."
                                    rows="2"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdate}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuestTracking;
