import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

const EnrollmentPanel = ({ modules }) => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedModule, setSelectedModule] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchMyNetwork = async () => {
        try {
            // Fetch users from my network
            const response = await api.get('/users/my-network/all');
            setUsers(Array.isArray(response.data) ? response.data : []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching users:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyNetwork();
    }, []);

    // Auto-fill phone/address when user is selected
    useEffect(() => {
        if (selectedUser) {
            const user = users.find(u => u.id === parseInt(selectedUser));
            if (user) {
                setPhone(user.phone || '');
                setAddress(user.address || '');
            }
        } else {
            setPhone('');
            setAddress('');
        }
    }, [selectedUser, users]);

    const handleEnroll = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post(`/seminars/${selectedModule}/enroll`, {
                userId: selectedUser,
                phone,
                address
            });

            setMessage('Usuario inscrito exitosamente');
            setSelectedUser('');
            // Keep module selected for faster batch enrollment
            setPhone('');
            setAddress('');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(`Error: ${error.response?.data?.error || 'Error de conexión'}`);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">Inscribir Estudiante</h3>

            <form onSubmit={handleEnroll} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Seleccionar Estudiante
                    </label>
                    <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        required
                        className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        disabled={loading}
                    >
                        <option value="">{loading ? 'Cargando...' : 'Seleccionar Estudiante...'}</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.fullName}</option>
                        ))}
                    </select>
                    {users.length === 0 && !loading && (
                        <p className="text-sm text-yellow-600 mt-1">
                            No se encontraron personas en tu red. Asegúrate de tener discípulos asignados.
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Teléfono
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Ej: 3001234567"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Dirección
                        </label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            required
                            className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Ej: Calle 123 # 45-67"
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={!selectedUser || !selectedModule}
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                    >
                        Inscribir
                    </button>
                </div>

                {message && (
                    <div className={`p-3 rounded-md ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {message}
                    </div>
                )}
            </form>
        </div>
    );
};

export default EnrollmentPanel;
