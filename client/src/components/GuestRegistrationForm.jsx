import { useState, useEffect } from 'react';
import { Save, Loader, X } from 'lucide-react';
import UserSearchSelect from './UserSearchSelect';
import api from '../utils/api';

const GuestRegistrationForm = ({ onGuestCreated }) => {
    const [formData, setFormData] = useState({
        documentType: '',
        documentNumber: '',
        name: '',
        birthDate: '',
        sex: '',
        phone: '',
        address: '',
        city: '',
        prayerRequest: '',
        invitedById: null,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);

        // Auto-set invitedById for leadership roles if applicable logic exists, 
        // however usually LIDER_CELULA and DISCIPULO set themselves.
        if (user && user.roles?.some(r => ['LIDER_CELULA', 'DISCIPULO'].includes(r))) {
            setFormData(prev => ({ ...prev, invitedById: user.id }));
        }
    }, []);

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

        const roles = currentUser?.roles || [];
        if (roles.some(r => ['SUPER_ADMIN', 'LIDER_DOCE'].includes(r)) && !formData.invitedById) {
            // Let it pass, backend handles defaults
        }

        try {
            const res = await api.post('/guests', formData);
            setSuccess('Invitado registrado exitosamente');
            setFormData({
                documentType: '',
                documentNumber: '',
                name: '',
                birthDate: '',
                sex: '',
                phone: '',
                address: '',
                city: '',
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
            documentType: '',
            documentNumber: '',
            name: '',
            birthDate: '',
            sex: '',
            phone: '',
            address: '',
            city: '',
            prayerRequest: '',
            invitedById: null,
        });
        setError('');
        setSuccess('');
    };

    // PASTOR no puede crear invitados - mostrar mensaje informativo
    if (currentUser?.roles?.includes('PASTOR')) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Registrar Nuevo Invitado</h2>
                <div className="bg-blue-900/20 border border-blue-500 text-blue-300 px-4 py-3 rounded">
                    <p className="font-semibold mb-2">Información</p>
                    <p>Los usuarios con rol PASTOR no pueden crear invitados directamente.</p>
                    <p className="mt-2">Los invitados deben ser creados por:</p>
                    <ul className="list-disc list-inside ml-4 mt-1">
                        <li>LIDER_DOCE</li>
                        <li>LIDER_CELULA</li>
                        <li>DISCIPULO</li>
                    </ul>
                    <p className="mt-2 text-sm">Puede ver todos los invitados de su red en la lista de invitados.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Registrar Nuevo Invitado</h2>

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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tipo de Documento
                        </label>
                        <select
                            name="documentType"
                            value={formData.documentType}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Seleccionar...</option>
                            <option value="RC">RC - Registro Civil</option>
                            <option value="TI">TI - Tarjeta de Identidad</option>
                            <option value="CC">CC - Cédula de Ciudadanía</option>
                            <option value="CE">CE - Cédula de Extranjería</option>
                            <option value="PP">PP - Pasaporte</option>
                            <option value="PEP">PEP - Permiso Especial de Permanencia</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Número de Documento
                        </label>
                        <input
                            type="text"
                            name="documentNumber"
                            value={formData.documentNumber}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nombre Completo <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Fecha de Nacimiento
                        </label>
                        <input
                            type="date"
                            name="birthDate"
                            value={formData.birthDate}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Sexo
                        </label>
                        <select
                            name="sex"
                            value={formData.sex}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Seleccionar...</option>
                            <option value="HOMBRE">Hombre</option>
                            <option value="MUJER">Mujer</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Teléfono <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Dirección
                        </label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Ciudad
                        </label>
                        <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {currentUser?.roles?.some(r => ['SUPER_ADMIN', 'LIDER_DOCE'].includes(r)) && (
                    <div>
                        <UserSearchSelect
                            label={<>Invitado Por <span className="text-red-400">*</span></>}
                            value={formData.invitedById}
                            onChange={(userId) => setFormData({ ...formData, invitedById: userId })}
                            placeholder="Seleccionar Discípulo que invitó..."
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Petición de Oración
                    </label>
                    <textarea
                        name="prayerRequest"
                        value={formData.prayerRequest}
                        onChange={handleChange}
                        rows="4"
                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
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
                        className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white px-6 py-3 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
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
