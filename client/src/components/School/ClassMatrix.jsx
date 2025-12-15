import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, UserPlus, CheckCircle, XCircle } from 'lucide-react';

const ClassMatrix = ({ courseId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [potentialStudents, setPotentialStudents] = useState([]); // For enrollment modal
    const [showEnrollModal, setShowEnrollModal] = useState(false);

    // Enrollment Form
    const [enrollForm, setEnrollForm] = useState({
        studentId: '',
        assignedAuxiliarId: ''
    });

    useEffect(() => {
        fetchMatrix();
        fetchUsers();
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

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPotentialStudents(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdate = async (enrollmentId, type, key, value) => {
        // Optimistic update could happen here, but for simplicity let's just push and refresh or allow local state drift until reload?
        // Let's rely on onBlur saving
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/school/matrix/update', {
                enrollmentId, type, key, value
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // console.log('Saved');
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
            fetchMatrix();
        } catch (err) {
            alert('Error enrolling student');
        }
    };

    if (loading) return <div className="text-center py-10">Cargando matriz...</div>;
    if (error) return <div className="text-center text-red-500 py-10">{error}</div>;

    const { module, matrix, permissions } = data;
    const { isProfessor, isAuxiliar } = permissions;
    const canEnroll = isProfessor; // Only professor/admin enrolls (can change based on req)

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
                            {[...Array(10)].map((_, i) => (
                                <th key={i} className="px-1 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[80px]">
                                    Clase {i + 1}
                                </th>
                            ))}
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">
                                Proyecto
                            </th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Nota Final
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {matrix.map((row) => {
                            // Determine editability for this row

                            const canEdit = isProfessor || (isAuxiliar && row.auxiliarId === parseInt(permissions.userId));
                            // *Note*: permissions.userId isn't in payload, need to pass it or rely on isAuxiliar logic from backend?
                            // Logic: In backend, we filtered fetch based on permissions. 
                            // But for Auxiliar, they only see rows they can edit? 
                            // Wait, if Professor sees all, he can edit all. 
                            // If Auxiliar views all (if we allowed viewing unassigned), filter needed. 
                            // But currently backend filters `findMany`. So if an Auxiliar sees a row, they can essentially edit it 
                            // UNLESS we want Read-Only for peers. 
                            // Backend `updateMatrix` checks `enrollment.assignedAuxiliarId === user.id`. 
                            // So UI should reflect that. Assume if rendered, check backend logic again. 
                            // Simplification: Render Inputs for all if `isProfessor`. 
                            // If `isAuxiliar`, render inputs ONLY if `row.auxiliarId` matches current user? 
                            // We didn't pass current user ID in `permissions` object. Let's rely on standard Auth Context or assume backend filter handled visibility. 
                            // Let's assume Editable = True for now, Backend will error if not allowed.

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
                                                    {/* Attendance Select */}
                                                    <select
                                                        className={`text-xs p-1 rounded border-none focus:ring-1 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white ${attendStatus === 'ASISTE' ? 'text-green-600 font-bold' :
                                                                attendStatus === 'AUSENCIA_NO_JUSTIFICADA' ? 'text-red-500' : ''
                                                            }`}
                                                        defaultValue={attendStatus}
                                                        onChange={(e) => handleUpdate(row.id, 'attendance', classNum, e.target.value)}
                                                    >
                                                        <option value="">-</option>
                                                        <option value="ASISTE">P</option>
                                                        <option value="AUSENCIA_JUSTIFICADA">J</option>
                                                        <option value="AUSENCIA_NO_JUSTIFICADA">I</option>
                                                        <option value="BAJA">B</option>
                                                    </select>

                                                    {/* Grade Input 1-5 */}
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">Inscribir Estudiante</h3>
                        <form onSubmit={handleEnroll} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estudiante</label>
                                <select
                                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
                                    value={enrollForm.studentId}
                                    onChange={e => setEnrollForm({ ...enrollForm, studentId: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    {potentialStudents.map(s => (
                                        <option key={s.id} value={s.id}>{s.fullName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asignar Auxiliar</label>
                                <select
                                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
                                    value={enrollForm.assignedAuxiliarId}
                                    onChange={e => setEnrollForm({ ...enrollForm, assignedAuxiliarId: e.target.value })}
                                >
                                    <option value="">Ninguno (o Profesor)</option>
                                    {module.auxiliaries.map(a => (
                                        <option key={a.id} value={a.id}>{a.fullName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setShowEnrollModal(false)} className="px-4 py-2 text-gray-600">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Inscribir</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassMatrix;
