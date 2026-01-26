import { useState, useEffect } from 'react';
import { UserPlus, Search, Trash2, Edit, Save } from 'lucide-react';
import api from '../utils/api';
import UserSearchSelect from './UserSearchSelect';

const EnrollmentPanel = () => {
    const [modules, setModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(false);

    // Module Staff State
    const [professor, setProfessor] = useState(null);
    const [auxiliaries, setAuxiliaries] = useState([]); // List of users
    const [showStaffEdit, setShowStaffEdit] = useState(false);
    const [auxSearch, setAuxSearch] = useState(null);

    useEffect(() => {
        fetchModules();
    }, []);

    useEffect(() => {
        if (selectedModule) {
            fetchEnrollments();
            fetchModuleDetails();
        }
    }, [selectedModule]);

    const fetchModules = async () => {
        try {
            const response = await api.get('/seminar');
            const data = response.data;
            setModules(data);
            if (data.length > 0) {
                // Determine displayed name vs numeric ID matching
                setSelectedModule(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching modules:', error);
        }
    };

    const fetchModuleDetails = async () => {
        try {
            const response = await api.get(`/seminar/${selectedModule}`);
            const data = response.data;
            setProfessor(data.professor || null);
            setAuxiliaries(data.auxiliaries || []);
        } catch (error) {
            console.error('Error fetching module details:', error);
        }
    };

    const fetchEnrollments = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/consolidar/seminar/enrollments/module/${selectedModule}`);
            setEnrollments(response.data);
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
            const response = await api.post('/consolidar/seminar/enrollments', {
                userId: selectedUser.id,
                moduleId: selectedModule
            });

            alert('Estudiante inscrito exitosamente');
            setSelectedUser(null);
            fetchEnrollments();
        } catch (error) {
            console.error('Error enrolling student:', error);
            alert(error.response?.data?.error || 'Error al inscribir estudiante');
        }
    };

    const handleRemoveStudent = async (enrollmentId) => {
        if (!confirm('¿Estás seguro de eliminar a este estudiante del módulo?')) return;

        try {
            await api.delete(`/consolidar/seminar/enrollments/${enrollmentId}`);
            alert('Estudiante eliminado.');
            fetchEnrollments();
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.error || 'Error al eliminar.');
        }
    };

    const handleSaveStaff = async () => {
        try {
            await api.put(`/seminar/${selectedModule}`, {
                professorId: professor?.id,
                auxiliaryIds: auxiliaries.map(a => a.id)
            });
            alert('Personal actualizado.');
            setShowStaffEdit(false);
        } catch (e) {
            console.error(e);
            alert('Error al guardar personal.');
        }
    };

    const addAuxiliary = (user) => {
        if (user && !auxiliaries.find(a => a.id === user.id)) {
            setAuxiliaries([...auxiliaries, user]);
            setAuxSearch(null); // Reset search field
        }
    };

    const removeAuxiliary = (userId) => {
        setAuxiliaries(auxiliaries.filter(a => a.id !== userId));
    };

    return (
        <div className="space-y-6">

            {/* Top Config Section: Module Select & Staff */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Edit className="w-5 h-5 text-purple-600" />
                        Configuración de Clase
                    </h3>
                    <button
                        onClick={() => setShowStaffEdit(!showStaffEdit)}
                        className="text-sm text-purple-600 underline hover:text-purple-800"
                    >
                        {showStaffEdit ? 'Ocultar Edición' : 'Editar Profesor/Aux'}
                    </button>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Seleccionar Módulo Activo
                    </label>
                    <select
                        value={selectedModule || ''}
                        onChange={(e) => setSelectedModule(parseInt(e.target.value))}
                        className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                        {modules.map(module => (
                            <option key={module.id} value={module.id}>
                                {module.name} ({module.code || module.moduleNumber})
                            </option>
                        ))}
                    </select>
                </div>

                {showStaffEdit && selectedModule && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Profesor Titular</label>
                                {professor ? (
                                    <div className="flex justify-between items-center bg-white p-2 border rounded">
                                        <span>{professor.fullName}</span>
                                        <button onClick={() => setProfessor(null)} className="text-red-500 text-xs">Cambiar</button>
                                    </div>
                                ) : (
                                    <UserSearchSelect onSelectUser={setProfessor} placeholder="Buscar Profesor..." />
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Auxiliares</label>
                                <div className="space-y-2 mb-2">
                                    {auxiliaries.map(aux => (
                                        <div key={aux.id} className="flex justify-between items-center bg-white p-2 border rounded text-sm">
                                            <span>{aux.fullName}</span>
                                            <button onClick={() => removeAuxiliary(aux.id)} className="text-red-500 hover:text-red-700">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <UserSearchSelect selectedUser={auxSearch} onSelectUser={addAuxiliary} placeholder="Agregar Auxiliar..." />
                            </div>
                        </div>
                        <button onClick={handleSaveStaff} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm">
                            <Save size={14} /> Guardar Personal
                        </button>
                    </div>
                )}
            </div>

            {/* Inscription Form */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-purple-600" />
                    Inscribir Estudiante
                </h3>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Buscar Estudiante
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

            {/* Enrollment List */}
            <div className="bg-white rounded-lg shadow-md">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">
                        Estudiantes Inscritos
                        {selectedModule && ` - ${modules.find(m => m.id === selectedModule)?.name || ''}`}
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
                                        Progreso
                                    </th>
                                    <th className="px-6 py-3 text-right">Acciones</th>
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
                                            {enrollment._count?.classAttendances || 0} / 12
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => handleRemoveStudent(enrollment.id)}
                                                className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full hover:bg-red-100 transition-colors"
                                                title="Eliminar Estudiante"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {enrollments.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                                            No hay estudiantes inscritos en este módulo.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EnrollmentPanel;
