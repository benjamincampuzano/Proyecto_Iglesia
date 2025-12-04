import { useState, useEffect } from 'react';
import { UserPlus, Search } from 'lucide-react';
import UserSearchSelect from './UserSearchSelect';

const EnrollmentPanel = () => {
    const [modules, setModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchModules();
    }, []);

    useEffect(() => {
        if (selectedModule) {
            fetchEnrollments();
        }
    }, [selectedModule]);

    const fetchModules = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/consolidar/seminar/modules', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setModules(data);
            if (data.length > 0) {
                setSelectedModule(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching modules:', error);
        }
    };

    const fetchEnrollments = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/consolidar/seminar/enrollments/module/${selectedModule}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setEnrollments(data);
        } catch (error) {
            console.error('Error fetching enrollments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnroll = async () => {
        if (!selectedUser || !selectedModule) {
            alert('Selecciona un estudiante y un módulo');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/consolidar/seminar/enrollments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: selectedUser.id,
                    moduleId: selectedModule
                })
            });

            if (response.ok) {
                alert('Estudiante inscrito exitosamente');
                setSelectedUser(null);
                fetchEnrollments();
            } else {
                const error = await response.json();
                alert(error.error || 'Error al inscribir estudiante');
            }
        } catch (error) {
            console.error('Error enrolling student:', error);
            alert('Error al inscribir estudiante');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-purple-600" />
                    Inscribir Estudiante
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Módulo
                        </label>
                        <select
                            value={selectedModule || ''}
                            onChange={(e) => setSelectedModule(parseInt(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                            {modules.map(module => (
                                <option key={module.id} value={module.id}>
                                    Módulo {module.moduleNumber}: {module.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estudiante
                        </label>
                        <UserSearchSelect
                            selectedUser={selectedUser}
                            onSelectUser={setSelectedUser}
                        />
                    </div>

                    <button
                        onClick={handleEnroll}
                        disabled={!selectedUser || !selectedModule}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
                    >
                        Inscribir
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">
                        Estudiantes Inscritos
                        {selectedModule && ` - ${modules.find(m => m.id === selectedModule)?.name}`}
                    </h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Cargando...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Estudiante
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Clases Registradas
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {enrollments.map((enrollment) => (
                                    <tr key={enrollment.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {enrollment.user.fullName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {enrollment.user.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${enrollment.status === 'COMPLETADO' ? 'bg-green-100 text-green-800' :
                                                    enrollment.status === 'EN_PROGRESO' ? 'bg-blue-100 text-blue-800' :
                                                        enrollment.status === 'ABANDONADO' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                }`}>
                                                {enrollment.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {enrollment._count?.classAttendances || 0} / 10
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EnrollmentPanel;
