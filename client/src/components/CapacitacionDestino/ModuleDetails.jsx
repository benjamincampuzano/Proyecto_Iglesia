import React, { useState, useEffect } from 'react';

const ModuleDetails = ({ module }) => {
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeModal, setActiveModal] = useState(null); // { enrollmentId, classNumber, currentStatus, currentGrade, currentNotes }

    const fetchEnrollments = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/seminars/${module.id}/enrollments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setEnrollments(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching enrollments:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEnrollments();
    }, [module]);

    const handleSaveAttendance = async (data) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/seminars/class-attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                // Update local state
                setEnrollments(prev => prev.map(enrollment => {
                    if (enrollment.id !== data.enrollmentId) return enrollment;

                    const existingAttendanceIndex = enrollment.classAttendances.findIndex(a => a.classNumber === data.classNumber);
                    let newClassAttendances = [...enrollment.classAttendances];

                    const newRecord = {
                        classNumber: data.classNumber,
                        status: data.status,
                        grade: data.grade
                    };

                    if (existingAttendanceIndex >= 0) {
                        newClassAttendances[existingAttendanceIndex] = { ...newClassAttendances[existingAttendanceIndex], ...newRecord };
                    } else {
                        newClassAttendances.push(newRecord);
                    }

                    return { ...enrollment, classAttendances: newClassAttendances };
                }));
                setActiveModal(null);
            }
        } catch (error) {
            console.error('Error recording attendance:', error);
        }
    };

    const handleProgressUpdate = async (enrollmentId, field, value) => {
        try {
            const token = localStorage.getItem('token');
            const body = { [field]: value };
            // Ensure numeric for grades
            if (field === 'finalProjectGrade') body[field] = parseFloat(value);

            const response = await fetch(`http://localhost:5000/api/seminars/enrollments/${enrollmentId}/progress`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                setEnrollments(prev => prev.map(e =>
                    e.id === enrollmentId ? { ...e, [field]: value } : e
                ));
            }
        } catch (error) {
            console.error('Error updating progress:', error);
        }
    };

    const getAttendanceData = (enrollment, classNum) => {
        return enrollment.classAttendances?.find(a => a.classNumber === classNum) || {};
    };

    // Modal Component
    const AttendanceModal = ({ data, onClose, onSave }) => {
        const [status, setStatus] = useState(data.currentStatus || 'AUSENTE');
        const [grade, setGrade] = useState(data.currentGrade || '');

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 shadow-xl">
                    <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Clase {data.classNumber}</h3>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Asistencia</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                        >
                            <option value="ASISTE">Asiste</option>
                            <option value="AUSENTE">Ausente</option>
                            <option value="AUSENCIA_JUSTIFICADA">Ausencia Justificada</option>
                        </select>
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Nota (0-5)</label>
                        <input
                            type="number"
                            min="0" max="5" step="0.1"
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300">Cancelar</button>
                        <button
                            onClick={() => onSave({
                                enrollmentId: data.enrollmentId,
                                classNumber: data.classNumber,
                                status,
                                grade
                            })}
                            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">{module.name} <span className="text-gray-500 text-lg">({module.code})</span></h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{module.description}</p>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estudiante</th>
                            {[...Array(10)].map((_, i) => (
                                <th key={i} className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    {i + 1}
                                </th>
                            ))}
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Proyecto (50%)</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                        {enrollments.map((enrollment) => (
                            <tr key={enrollment.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{enrollment.user.fullName}</div>
                                </td>
                                {[...Array(10)].map((_, i) => {
                                    const classNum = i + 1;
                                    const attData = getAttendanceData(enrollment, classNum);
                                    const hasData = attData.status === 'ASISTE' || attData.grade !== undefined;

                                    return (
                                        <td key={i} className="px-2 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => setActiveModal({
                                                    enrollmentId: enrollment.id,
                                                    classNumber: classNum,
                                                    currentStatus: attData.status,
                                                    currentGrade: attData.grade
                                                })}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${attData.status === 'ASISTE'
                                                        ? 'bg-green-100 text-green-800 border-green-300'
                                                        : attData.grade // If marked but maybe absent? Or just showing grade
                                                            ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                                            : 'bg-gray-100 text-gray-400 border-gray-300 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {attData.grade || (attData.status === 'ASISTE' ? '✓' : '-')}
                                            </button>
                                        </td>
                                    );
                                })}
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <input
                                        type="number"
                                        min="0"
                                        max="5"
                                        placeholder="Nota"
                                        step="0.1"
                                        value={enrollment.finalProjectGrade || ''}
                                        onChange={(e) => handleProgressUpdate(enrollment.id, 'finalProjectGrade', e.target.value)}
                                        className="w-20 p-1 border border-gray-300 rounded text-center dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <select
                                        value={enrollment.status}
                                        onChange={(e) => handleProgressUpdate(enrollment.id, 'status', e.target.value)}
                                        className="p-1 border border-gray-300 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="INSCRITO">Inscrito</option>
                                        <option value="EN_PROGRESO">En Progreso</option>
                                        <option value="COMPLETADO">Completado</option>
                                        <option value="ABANDONADO">Abandonado</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {enrollments.length === 0 && !loading && (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                        No hay estudiantes inscritos en este módulo.
                    </div>
                )}
            </div>
            {activeModal && (
                <AttendanceModal
                    data={activeModal}
                    onClose={() => setActiveModal(null)}
                    onSave={handleSaveAttendance}
                />
            )}
        </div>
    );
};

export default ModuleDetails;
