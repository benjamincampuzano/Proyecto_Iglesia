import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Calendar, Users, Trash2, Edit } from 'lucide-react';
import { useAuth } from "../../context/AuthContext";
import ClassMatrix from './ClassMatrix';

const SCHOOL_LEVELS = [
    { nivel: '1', seccion: 'A', name: 'Pastoreados en su amor', moduleNumber: 1 },
    { nivel: '1', seccion: 'B', name: 'El poder de una Vision', moduleNumber: 2 },
    { nivel: '2', seccion: 'A', name: 'La estrategia del Ganar', moduleNumber: 3 },
    { nivel: '2', seccion: 'B', name: 'Familias con Proposito', moduleNumber: 4 },
    { nivel: '3', seccion: 'A', name: 'Liderazgo Eficaz', moduleNumber: 5 },
    { nivel: '3', seccion: 'B', name: 'El Espiritu Santo en Mi', moduleNumber: 6 }
];

const CourseManagement = () => {
    const { user, hasRole, hasAnyRole, isSuperAdmin } = useAuth();
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        professorId: '',
        auxiliarIds: [],
        nivel: '1',
        seccion: 'A'
    });

    const [leaders, setLeaders] = useState([]);

    useEffect(() => {
        fetchCourses();
        const canFetchLeaders = isSuperAdmin() || hasRole('PROFESOR') || hasRole('LIDER_DOCE');

        if (canFetchLeaders) {
            fetchLeaders();
        }
    }, [user.roles]);

    const fetchCourses = async () => {
        try {
            const res = await api.get('/school/modules');
            setCourses(res.data);
        } catch (error) {
            console.error('Error fetching courses', error);
        }
    };

    const fetchLeaders = async () => {
        try {
            const res = await api.get('/users');
            setLeaders(res.data || []);
        } catch (error) {
            console.error('Error fetching users', error);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('¿Estás seguro de eliminar esta clase? Se perderán todas las inscripciones y notas.')) return;
        try {
            await api.delete(`/school/modules/${id}`);
            fetchCourses();
        } catch (error) {
            alert('Error, No se puede eliminar la clase porque existen estudiantes inscritos y notas asociadas. Primero debe desvincular a todos los estudiantes.');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            // Construct name and moduleNumber from selected level
            const selectedLevel = SCHOOL_LEVELS.find(l => l.nivel === formData.nivel && l.seccion === formData.seccion);
            const finalName = selectedLevel ? `${selectedLevel.name} (Nivel ${selectedLevel.nivel}${selectedLevel.seccion})` : `Escuela ${formData.nivel}${formData.seccion}`;
            const modId = selectedLevel ? selectedLevel.moduleNumber : 0;

            await api.post('/school/modules', {
                ...formData,
                name: finalName,
                moduleId: modId
            });
            setShowCreateModal(false);
            setFormData({ ...formData, name: '', description: '', professorId: '', auxiliarIds: [], startDate: '', endDate: '' });
            fetchCourses();
        } catch (error) {
            alert('Error creating course');
        }
    };

    const openEditModal = (e, course) => {
        e.stopPropagation();
        setEditingCourse(course);
        setFormData({
            name: course.name,
            description: course.description || '',
            startDate: course.startDate ? course.startDate.split('T')[0] : '',
            endDate: course.endDate ? course.endDate.split('T')[0] : '',
            professorId: course.professor?.id || '',
            auxiliarIds: course.auxiliaries ? course.auxiliaries.map(a => a.id) : [],
            nivel: '1',
            seccion: 'A'
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/school/modules/${editingCourse.id}`, formData);
            setShowEditModal(false);
            setEditingCourse(null);
            fetchCourses();
        } catch (error) {
            alert('Error updating course');
        }
    };

    if (selectedCourseId) {
        return (
            <div>
                <button
                    onClick={() => setSelectedCourseId(null)}
                    className="mb-4 text-blue-500 hover:underline"
                >
                    &larr; Volver a Lista de Clases
                </button>
                <ClassMatrix courseId={selectedCourseId} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Escuelas de Discipulado</h2>
                {hasAnyRole(['ADMIN', 'PROFESOR', 'LIDER_DOCE']) && (
                    <button
                        onClick={() => { setShowCreateModal(true); setFormData({ ...formData, name: '' }); }}
                        className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                    >
                        <Plus size={20} className="mr-2" />
                        Nueva Clase
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => (
                    <div
                        key={course.id}
                        onClick={() => setSelectedCourseId(course.id)}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow p-6 border border-gray-200 dark:border-gray-700 relative group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{course.name}</h3>
                            {hasAnyRole(['ADMIN', 'PROFESOR', 'LIDER_DOCE']) && (
                                <div className="flex space-x-2">
                                    <button
                                        onClick={(e) => openEditModal(e, course)}
                                        className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50 transition-colors"
                                        title="Editar"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(e, course.id)}
                                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full mb-2 inline-block">
                            {course._count?.enrollments || 0} Estudiantes
                        </span>
                        <p className="text-gray-500 text-sm mb-4 line-clamp-2">{course.description}</p>

                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center">
                                <Users size={16} className="mr-2" />
                                <span>Prof: {course.professor?.fullName || 'N/A'}</span>
                            </div>
                            <div className="flex items-center">
                                <Calendar size={16} className="mr-2" />
                                <span>
                                    {course.startDate ? new Date(course.startDate).toLocaleDateString() : 'Sin fecha'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create/Edit Modal */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 transition-all">
                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-filter backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-lg w-full p-8">
                        <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white border-b pb-2">
                            {showEditModal ? 'Editar Clase' : 'Nueva Clase'}
                        </h3>
                        <form onSubmit={showEditModal ? handleUpdate : handleCreate} className="space-y-5">

                            {/* Nivel/Seccion Selection only for Create */}
                            {!showEditModal && (
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Seleccionar Nivel (Clase)</label>
                                        <select
                                            className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 rounded-lg dark:text-white border border-gray-200 dark:border-gray-600"
                                            value={`${formData.nivel}${formData.seccion}`}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setFormData({ ...formData, nivel: val.substring(0, 1), seccion: val.substring(1) });
                                            }}
                                        >
                                            {SCHOOL_LEVELS.map(level => (
                                                <option key={`${level.nivel}${level.seccion}`} value={`${level.nivel}${level.seccion}`}>
                                                    {level.nivel}{level.seccion} - {level.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Name Input - Only visible/editable when editing */}
                            {showEditModal && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg dark:text-white"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                                <textarea
                                    className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg dark:text-white"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows="2"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
                                    <input type="date" className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700/50 dark:text-white dark:border-gray-600" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Fecha Fin</label>
                                    <input type="date" className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700/50 dark:text-white dark:border-gray-600" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Profesor</label>
                                <select
                                    className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg dark:text-white"
                                    value={formData.professorId}
                                    onChange={e => setFormData({ ...formData, professorId: e.target.value })}
                                >
                                    <option value="">Seleccionar Profesor</option>
                                    {leaders.map(l => (
                                        <option key={l.id} value={l.id}>{l.fullName}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Auxiliares (Ctrl+Click)</label>
                                <select
                                    multiple
                                    className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg dark:text-white h-24"
                                    value={formData.auxiliarIds}
                                    onChange={e => setFormData({ ...formData, auxiliarIds: Array.from(e.target.selectedOptions, o => o.value) })}
                                >
                                    {leaders.map(l => (
                                        <option key={l.id} value={l.id}>{l.fullName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="px-5 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Cancelar</button>
                                <button type="submit" className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold hover:shadow-lg">{showEditModal ? 'Guardar Cambios' : 'Crear Clase'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseManagement;
