import { useState, useEffect } from 'react';
import { ClipboardList } from 'lucide-react';
import api from '../utils/api';

const ClassAttendanceTracker = () => {
    const [modules, setModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);
    const [selectedClass, setSelectedClass] = useState(1);
    const [enrollments, setEnrollments] = useState([]);
    const [attendances, setAttendances] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const statusOptions = [
        { value: 'ASISTE', label: 'Asiste', color: 'bg-green-100 text-green-800' },
        { value: 'AUSENCIA_JUSTIFICADA', label: 'Ausencia Justificada', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'AUSENCIA_NO_JUSTIFICADA', label: 'Ausencia No Justificada', color: 'bg-red-100 text-red-800' },
        { value: 'BAJA', label: 'Baja', color: 'bg-gray-100 text-gray-800' }
    ];

    useEffect(() => {
        fetchModules();
    }, []);

    useEffect(() => {
        if (selectedModule) {
            fetchEnrollments();
        }
    }, [selectedModule, selectedClass]);

    const fetchModules = async () => {
        try {
            const response = await api.get('/consolidar/seminar/modules');
            const data = response.data;
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
            const response = await api.get(`/consolidar/seminar/enrollments/module/${selectedModule}`);
            setEnrollments(response.data);

            // Fetch existing attendances for this class
            const attendanceResponse = await api.get(`/consolidar/seminar/class-attendance/module/${selectedModule}/class/${selectedClass}`);
            const attendanceData = attendanceResponse.data;

            const attendanceMap = {};
            attendanceData.forEach(att => {
                attendanceMap[att.enrollment.id] = att.status;
            });
            setAttendances(attendanceMap);
        } catch (error) {
            console.error('Error fetching enrollments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (enrollmentId, status) => {
        setAttendances(prev => ({
            ...prev,
            [enrollmentId]: status
        }));
    };

    const handleSave = async (enrollmentId) => {
        try {
            setSaving(true);
            await api.post('/consolidar/seminar/class-attendance', {
                enrollmentId,
                classNumber: selectedClass,
                status: attendances[enrollmentId] || 'ASISTE'
            });
            alert('Asistencia guardada');
        } catch (error) {
            console.error('Error saving attendance:', error);
            alert('Error al guardar asistencia');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 flex-wrap">
                <ClipboardList className="w-6 h-6 text-purple-600" />
                <select
                    value={selectedModule || ''}
                    onChange={(e) => setSelectedModule(parseInt(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                    {modules.map(module => (
                        <option key={module.id} value={module.id}>
                            Módulo {module.moduleNumber}: {module.name}
                        </option>
                    ))}
                </select>

                <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(parseInt(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                    {[...Array(10)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                            Clase {i + 1}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="text-center py-8">Cargando...</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Estudiante
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Estado de Asistencia
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    Acción
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {enrollments.map((enrollment) => {
                                const status = attendances[enrollment.id] || 'ASISTE';
                                const statusOption = statusOptions.find(opt => opt.value === status);

                                return (
                                    <tr key={enrollment.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {enrollment.user.fullName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                value={status}
                                                onChange={(e) => handleStatusChange(enrollment.id, e.target.value)}
                                                className={`px-3 py-1 rounded-full text-sm font-medium ${statusOption?.color}`}
                                            >
                                                {statusOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => handleSave(enrollment.id)}
                                                disabled={saving}
                                                className="px-4 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:bg-gray-400"
                                            >
                                                Guardar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ClassAttendanceTracker;
