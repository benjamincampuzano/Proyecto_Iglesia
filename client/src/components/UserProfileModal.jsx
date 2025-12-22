import { useState } from 'react';
import { X, Save, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const UserProfileModal = ({ isOpen, onClose }) => {
    const { user, updateProfile } = useAuth();
    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        email: user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPasswordFields, setShowPasswordFields] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const res = await api.put(
                '/users/profile',
                {
                    fullName: formData.fullName,
                    email: formData.email,
                }
            );

            // Update local storage and context
            const updatedUser = res.data.user;
            localStorage.setItem('user', JSON.stringify(updatedUser));
            updateProfile(updatedUser);

            setSuccess('Perfil actualizado exitosamente');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al actualizar perfil');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            setLoading(false);
            return;
        }

        if (formData.newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            setLoading(false);
            return;
        }

        try {
            await api.put(
                '/users/password',
                {
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword,
                }
            );

            setSuccess('Contraseña cambiada exitosamente');
            setFormData({
                ...formData,
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
            setShowPasswordFields(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cambiar contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Mi Perfil</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-900/20 border border-green-500 text-green-400 px-4 py-3 rounded">
                            {success}
                        </div>
                    )}

                    {/* Profile Form */}
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Nombre Completo
                            </label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Correo Electrónico
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader size={20} className="animate-spin" />
                            ) : (
                                <>
                                    <Save size={20} />
                                    <span>Guardar Cambios</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Password Change Section */}
                    <div className="border-t border-gray-700 pt-4">
                        {!showPasswordFields ? (
                            <button
                                onClick={() => setShowPasswordFields(true)}
                                className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                                Cambiar Contraseña
                            </button>
                        ) : (
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <h3 className="text-lg font-semibold text-white">Cambiar Contraseña</h3>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Contraseña Actual
                                    </label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={formData.currentPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Nueva Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Confirmar Nueva Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>

                                <div className="flex space-x-3">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <Loader size={20} className="animate-spin" />
                                        ) : (
                                            <>
                                                <Save size={20} />
                                                <span>Cambiar</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPasswordFields(false);
                                            setFormData({
                                                ...formData,
                                                currentPassword: '',
                                                newPassword: '',
                                                confirmPassword: '',
                                            });
                                        }}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;
