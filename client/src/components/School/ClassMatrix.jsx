import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, UserPlus, Trash2, BookOpen, ExternalLink } from 'lucide-react';
import ClassMaterialManager from './ClassMaterialManager';

const ClassMatrix = ({ courseId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [potentialStudents, setPotentialStudents] = useState([]);
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [selectedClassNum, setSelectedClassNum] = useState(null);
    const [classMaterials, setClassMaterials] = useState([]);

    // Enrollment Form
    const [enrollForm, setEnrollForm] = useState({
        studentId: '',
        assignedAuxiliarId: ''
    });

    useEffect(() => {
        fetchMatrix();
        fetchUsers();
        fetchMaterials();
    }, [courseId]);

    const fetchMatrix = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5000/api/school/modules/${courseId}/matrix`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
            setLoading(false);
        } catch (err) {
            setError('Error loading matrix');
            setLoading(false);
        }
    };

    const fetchMaterials = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5000/api/school/modules/${courseId}/materials`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClassMaterials(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPotentialStudents(res.data.users || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdate = async (enrollmentId, type, key, value) => {
        // Optimistic update could happen here
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/school/matrix/update', {
                enrollmentId, type, key, value
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            alert('Error guarding change');
        }
    };

    const handleEnroll = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/school/enroll', {
                moduleId: courseId,
                studentId: enrollForm.studentId,
                assignedAuxiliarId: enrollForm.assignedAuxiliarId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowEnrollModal(false);
            setEnrollForm({ studentId: '', assignedAuxiliarId: '' });
            fetchMatrix();
        } catch (err) {
            alert('Error enrolling student: ' + (err.response?.data?.error || 'Unknown error'));
        }
    };

    const handleDeleteEnrollment = async (enrollmentId) => {
        if (!window.confirm("¿Seguro que deseas eliminar a este estudiante de la clase?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/school/enrollments/${enrollmentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchMatrix();
        } catch (error) {
            alert('Error deleting student');
        }
    };

    if (loading) return <div className="text-center py-10">Cargando matriz...</div>;
    if (error) return <div className="text-center text-red-500 py-10">{error}</div>;

    const { module, matrix, permissions } = data;
    const { isProfessor, isAuxiliar } = permissions;
    const canEnroll = isProfessor || permissions.isProfessor; // Corrected check

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{module.name}</h2>
                    <p className="text-sm text-gray-500">
                        Profesor: {module.professor?.fullName} | {module.auxiliaries?.length} Auxiliares
                    </p>
                </div>
                {canEnroll && (
                    <button
                        onClick={() => setShowEnrollModal(true)}
                        className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                    >
                        <UserPlus size={18} className="mr-2" />
                        Inscribir Estudiante
                    </button>
                )}
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-700 z-10 w-48">
                                Estudiante
                            </th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">
                                Auxiliar
                            </th>
                            {[...Array(10)].map((_, i) => {
                                const classNum = i + 1;
                                const hasMaterial = classMaterials.some(m => m.classNumber === classNum);
                                return (
                                    <th key={i} className="px-1 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[80px]">
                                        <div className="flex flex-col items-center gap-1">
                                            <span>Clase {classNum}</span>
                                            {isProfessor && (
                                                <button
                                                    onClick={() => { setSelectedClassNum(classNum); setShowMaterialModal(true); }}
                                                    className={`p-1 rounded transition-colors ${hasMaterial ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-blue-500'}`}
                                                    title="Gestionar Material"
                                                >
                                                    <BookOpen size={14} />
                                                </button>
                                            )}
                                            {(!isProfessor && hasMaterial) && (
                                                <div className="text-blue-500" title="Material Disponible">
                                                    <BookOpen size={14} />
                                                </div>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">
                                Proyecto
                            </th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Nota Final
                            </th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {matrix.map((row) => {
                            // Check backend permissions logic or use state
                            const canEdit = isProfessor || (isAuxiliar && row.auxiliarId === parseInt(permissions.userId || 0)); // userId not passed currently in permissions object, relying on backend validation mostly, but valid UI check would need userId.

                            return (
                                <tr key={row.id}>
                                    <td className="px-3 py-4 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap sticky left-0 bg-white dark:bg-gray-800">
                                        {row.studentName}
                                    </td>
                                    <td className="px-2 py-4 text-xs text-gray-500 dark:text-gray-400">
                                        {row.auxiliarName}
                                    </td>

                                    {/* 10 Classes */}
                                    {[...Array(10)].map((_, i) => {
                                        const classNum = i + 1;
                                        const attendStatus = row.attendances[classNum] || '';
                                        const grade = row.grades[classNum] || '';

                                        return (
                                            <td key={classNum} className="px-1 py-2 border-l border-gray-100 dark:border-gray-700">
                                                <div className="flex flex-col space-y-1">
                                                    <select
                                                        className={`text-xs p-1 rounded border-none focus:ring-1 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white font-bold ${attendStatus === 'ASISTE' ? 'text-green-600' :
                                                            attendStatus === 'AUSENCIA_JUSTIFICADA' ? 'text-yellow-600' :
                                                                attendStatus === 'AUSENCIA_NO_JUSTIFICADA' ? 'text-red-500' :
                                                                    attendStatus === 'BAJA' ? 'text-gray-900 dark:text-gray-300' : ''
                                                            }`}
                                                        defaultValue={attendStatus}
                                                        onChange={(e) => handleUpdate(row.id, 'attendance', classNum, e.target.value)}
                                                    >
                                                        <option value="">-</option>
                                                        <option value="ASISTE">AS</option>
                                                        <option value="AUSENCIA_JUSTIFICADA">AJ</option>
                                                        <option value="AUSENCIA_NO_JUSTIFICADA">ASJ</option>
                                                        <option value="BAJA">BJ</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="5"
                                                        step="0.1"
                                                        placeholder="Nota"
                                                        className="w-full text-xs p-1 bg-transparent border-b border-gray-200 dark:border-gray-600 focus:outline-none focus:border-blue-500 text-center dark:text-white"
                                                        defaultValue={grade}
                                                        onBlur={(e) => handleUpdate(row.id, 'grade', classNum, e.target.value)}
                                                    />
                                                </div>
                                            </td>
                                        );
                                    })}

                                    {/* Project */}
                                    <td className="px-2 py-4 text-sm ">
                                        <textarea
                                            rows="2"
                                            className="w-full text-xs p-1 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                            placeholder="Obs..."
                                            defaultValue={row.projectNotes || ''}
                                            onBlur={(e) => handleUpdate(row.id, 'projectNotes', null, e.target.value)}
                                        />
                                    </td>

                                    {/* Final Grade */}
                                    <td className="px-2 py-4 text-sm font-bold text-center">
                                        <input
                                            type="number"
                                            min="1"
                                            max="5"
                                            step="0.1"
                                            className="w-16 p-1 border rounded text-center dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                            defaultValue={row.finalGrade || ''}
                                            onBlur={(e) => handleUpdate(row.id, 'finalGrade', null, e.target.value)}
                                        />
                                    </td>

                                    {/* Actions */}
                                    <td className="px-2 py-4 text-center">
                                        {canEnroll && (
                                            <button
                                                onClick={() => handleDeleteEnrollment(row.id)}
                                                className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                                title="Eliminar Estudiante"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {matrix.length === 0 && (
                    <p className="text-gray-500 text-center py-6">No hay estudiantes inscritos.</p>
                )}
            </div>

            {/* Enroll Modal */}
            {showEnrollModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 transition-all">
                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-filter backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-lg w-full p-8 transform transition-all scale-100">
                        <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Inscribir Estudiante</h3>
                        <form onSubmit={handleEnroll} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Estudiante</label>
                                <select
                                    className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
                                    value={enrollForm.studentId}
                                    onChange={e => setEnrollForm({ ...enrollForm, studentId: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccionar Estudiante...</option>
                                    {potentialStudents.filter(u => !matrix.some(m => m.studentId === u.id)).map(s => ( // Filter already enrolled
                                        <option key={s.id} value={s.id}>{s.fullName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Asignar Auxiliar</label>
                                <select
                                    className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
                                    value={enrollForm.assignedAuxiliarId}
                                    onChange={e => setEnrollForm({ ...enrollForm, assignedAuxiliarId: e.target.value })}
                                >
                                    <option value="">Ninguno (o Profesor)</option>
                                    {module.auxiliaries.map(a => (
                                        <option key={a.id} value={a.id}>{a.fullName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-2">
                                <button type="button" onClick={() => setShowEnrollModal(false)} className="px-6 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors">Cancelar</button>
                                <button type="submit" className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold hover:shadow-lg transform hover:-translate-y-0.5 transition-all">Inscribir</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Material Modal */}
            {showMaterialModal && (
                <ClassMaterialManager
                    moduleId={courseId}
                    classNumber={selectedClassNum}
                    onClose={() => {
                        setShowMaterialModal(false);
                        fetchMaterials();
                    }}
                />
            )}
        </div>
    );
};

export default ClassMatrix;
