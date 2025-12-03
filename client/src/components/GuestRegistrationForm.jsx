import { useState } from 'react';
import { Save, Loader, X } from 'lucide-react';
import UserSearchSelect from './UserSearchSelect';
import axios from 'axios';

const GuestRegistrationForm = ({ onGuestCreated }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        prayerRequest: '',
        invitedById: null,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (!formData.invitedById) {
            setError('Debe seleccionar quién invitó al invitado');
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(
                'http://localhost:5000/api/guests',
                formData,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            setSuccess('Invitado registrado exitosamente');
            setFormData({
                name: '',
                phone: '',
                address: '',
                prayerRequest: '',
                invitedById: null,
            });

            if (onGuestCreated) {
                onGuestCreated(res.data.guest);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al registrar invitado');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFormData({
            name: '',
            phone: '',
            address: '',
            prayerRequest: '',
            invitedById: null,
        });
        setError('');
        setSuccess('');
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Registrar Nuevo Invitado</h2>

            {error && (
                <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-900/20 border border-green-500 text-green-400 px-4 py-3 rounded mb-4">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Nombre Completo <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Teléfono <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Dirección
                    </label>
                    <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div>
                    <UserSearchSelect
                        label={<>Invitado Por <span className="text-red-400">*</span></>}
                        value={formData.invitedById}
                        onChange={(userId) => setFormData({ ...formData, invitedById: userId })}
                        placeholder="Seleccionar miembro que invitó..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Petición de Oración
                    </label>
                    <textarea
                        name="prayerRequest"
                        value={formData.prayerRequest}
                        onChange={handleChange}
                        rows="4"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
                        placeholder="Escriba la petición de oración del invitado..."
                    />
                </div>

                <div className="flex space-x-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader size={20} className="animate-spin" />
                        ) : (
                            <>
                                <Save size={20} />
                                <span>Registrar Invitado</span>
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
                    >
                        <X size={20} />
                        <span>Limpiar</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default GuestRegistrationForm;
