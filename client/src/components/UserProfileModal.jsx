import { useState, useEffect } from 'react';
import { X, Save, Loader, Check, X as XIcon } from 'lucide-react';
import { validatePassword, getPasswordStrength } from '../utils/passwordValidator';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const UserProfileModal = ({ isOpen, onClose }) => {
    const { user, updateProfile } = useAuth();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        documentType: '',
        documentNumber: '',
        birthDate: '',
        phone: '',
        address: '',
        city: '',
        sex: 'HOMBRE',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPasswordFields, setShowPasswordFields] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchProfile();
        }
    }, [isOpen]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await api.get('/users/profile');
            const userData = res.data.user;
            setFormData({
                fullName: userData.fullName || '',
                email: userData.email || '',
                documentType: userData.documentType || '',
                documentNumber: userData.documentNumber || '',
                birthDate: userData.birthDate ? userData.birthDate.split('T')[0] : '',
                phone: userData.phone || '',
                address: userData.address || '',
                city: userData.city || '',
                sex: userData.sex || 'HOMBRE',
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
            // Update auth context if it's different
            if (JSON.stringify(userData) !== JSON.stringify(user)) {
                localStorage.setItem('user', JSON.stringify(userData));
                updateProfile(userData);
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            // Fallback to context user if fetch fails
            if (user) {
                setFormData(prev => ({
                    ...prev,
                    fullName: user.fullName || '',
                    email: user.email || '',
                    documentType: user.documentType || '',
                    documentNumber: user.documentNumber || '',
                    birthDate: user.birthDate ? user.birthDate.split('T')[0] : '',
                    phone: user.phone || '',
                    address: user.address || '',
                    city: user.city || '',
                    sex: user.sex || 'HOMBRE',
                }));
            }
        } finally {
            setLoading(false);
        }
    };

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
                    documentType: formData.documentType,
                    documentNumber: formData.documentNumber,
                    birthDate: formData.birthDate,
                    phone: formData.phone,
                    address: formData.address,
                    city: formData.city,
                    sex: formData.sex,
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

        const validation = validatePassword(formData.newPassword, { email: formData.email, fullName: formData.fullName });
        if (!validation.isValid) {
            setError(validation.message);
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl md:max-w-4xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mi Perfil</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Documento</label>
                                <select
                                    name="documentType"
                                    value={formData.documentType}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="RC">RC</option>
                                    <option value="TI">TI</option>
                                    <option value="CC">CC</option>
                                    <option value="CE">CE</option>
                                    <option value="PP">PP</option>
                                    <option value="PEP">PEP</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Número de Documento</label>
                                <input
                                    type="text"
                                    name="documentNumber"
                                    value={formData.documentNumber || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Nombre Completo
                                </label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fecha de Nacimiento</label>
                                <input
                                    type="date"
                                    name="birthDate"
                                    value={formData.birthDate || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Teléfono
                                </label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
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
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="HOMBRE">Hombre</option>
                                    <option value="MUJER">Mujer</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Dirección
                                </label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
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
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
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
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        {!showPasswordFields ? (
                            <button
                                onClick={() => setShowPasswordFields(true)}
                                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                            >
                                Cambiar Contraseña
                            </button>
                        ) : (
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cambiar Contraseña</h3>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Contraseña Actual
                                    </label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={formData.currentPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nueva Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        required
                                    />
                                    {formData.newPassword && (
                                        <div className="mt-2 space-y-2">
                                            <div className="flex gap-1">
                                                {[...Array(4)].map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-1 flex-1 rounded-full transition-colors ${i < getPasswordStrength(formData.newPassword)
                                                            ? ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'][getPasswordStrength(formData.newPassword) - 1]
                                                            : 'bg-gray-700'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                <Requirement label="8+ caracteres" met={formData.newPassword.length >= 8} />
                                                <Requirement label="Mayúscula/Minúscula" met={/[A-Z]/.test(formData.newPassword) && /[a-z]/.test(formData.newPassword)} />
                                                <Requirement label="Número" met={/\d/.test(formData.newPassword)} />
                                                <Requirement label="Símbolo" met={/[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword)} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Confirmar Nueva Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
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
                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-lg transition-colors"
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

const Requirement = ({ label, met }) => (
    <div className={`flex items-center gap-1 ${met ? 'text-green-500' : 'text-gray-500'}`}>
        {met ? <Check size={10} /> : <XIcon size={10} />}
        <span>{label}</span>
    </div>
);

export default UserProfileModal;
