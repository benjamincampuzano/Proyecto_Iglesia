import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, Check, X as XIcon } from 'lucide-react';
import { validatePassword, getPasswordStrength } from '../utils/passwordValidator';
import api from '../utils/api';

const Register = () => {
    const [formData, setFormData] = useState({
        documentType: '',
        documentNumber: '',
        fullName: '',
        birthDate: '',
        email: '',
        password: '',
        sex: 'HOMBRE',
        phone: '',
        address: '',
        city: '',
        liderDoceId: ''
    });
    const [lideresDoce, setLideresDoce] = useState([]);
    const [error, setError] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();

    // Fetch public leaders (LIDER_DOCE) for the dropdown
    useState(() => {
        const fetchLeaders = async () => {
            try {
                const response = await api.get('/auth/leaders');
                setLideresDoce(response.data);
            } catch (err) {
                console.error('Error fetching leaders:', err);
            }
        };
        fetchLeaders();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const validation = validatePassword(formData.password, { email: formData.email, fullName: formData.fullName });
        if (!validation.isValid) {
            setError(validation.message);
            return;
        }

        const result = await register(formData);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md md:max-w-4xl border border-gray-700 max-h-[90vh] overflow-y-auto">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white">Crear Cuenta</h2>
                    <p className="text-gray-400 mt-2">Únete a la plataforma</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {/* Left Column */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Tipo de Documento</label>
                                    <select
                                        name="documentType"
                                        value={formData.documentType}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
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
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Número de Documento</label>
                                    <input
                                        type="text"
                                        name="documentNumber"
                                        value={formData.documentNumber}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="12345678"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Nombre Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-10 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="Juan Pérez"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Fecha de Nacimiento</label>
                                <input
                                    type="date"
                                    name="birthDate"
                                    value={formData.birthDate}
                                    onChange={handleChange}
                                    className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-10 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="tu@email.com"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-10 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                {formData.password && (
                                    <div className="mt-2 space-y-2">
                                        <div className="flex gap-1">
                                            {[...Array(4)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1 flex-1 rounded-full transition-colors ${i < getPasswordStrength(formData.password)
                                                        ? ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'][getPasswordStrength(formData.password) - 1]
                                                        : 'bg-gray-700'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                            <Requirement label="8+ caracteres" met={formData.password.length >= 8} />
                                            <Requirement label="Mayúscula/Minúscula" met={/[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password)} />
                                            <Requirement label="Número" met={/\d/.test(formData.password)} />
                                            <Requirement label="Símbolo" met={/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Sexo</label>
                                    <select
                                        name="sex"
                                        value={formData.sex}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                    >
                                        <option value="HOMBRE">Hombre</option>
                                        <option value="MUJER">Mujer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Teléfono</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="Teléfono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Dirección</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="Dirección"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Ciudad</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="Ciudad"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Líder de Los Doce</label>
                                <select
                                    name="liderDoceId"
                                    value={formData.liderDoceId}
                                    onChange={handleChange}
                                    className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                >
                                    <option value="">-- Selecciona tu líder --</option>
                                    {lideresDoce.map(leader => (
                                        <option key={leader.id} value={leader.id}>
                                            {leader.fullName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 rounded-lg transition-colors shadow-lg shadow-blue-600/20 mt-6 text-lg"
                    >
                        Registrarse
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-400">
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                        Inicia sesión aquí
                    </Link>
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

export default Register;
