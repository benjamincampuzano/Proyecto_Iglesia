import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Calendar, Users, BookOpen } from 'lucide-react';
import { useAuth } from "../../context/AuthContext";
import ClassMatrix from './ClassMatrix';

const CourseManagement = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        professorId: '',
        auxiliarIds: [] // Multi-select
    });

    const [leaders, setLeaders] = useState([]); // For selecting Prof/Aux

    useEffect(() => {
        fetchCourses();
        if (user.role === 'SUPER_ADMIN' || user.role === 'LIDER_DOCE') {
            fetchLeaders();
        }
    }, [user.role]);

    const fetchCourses = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/school/modules', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourses(res.data);
        } catch (error) {
            console.error('Error fetching courses', error);
        }
    };

    const fetchLeaders = async () => {
        // Fetch users to populate dropdowns
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter only potential leaders? Or all?
            // "Auxiliar: rol: LIDER_DOCE, LIDER_CELULA, MIEMBRO" -> All seem eligible.
            setLeaders(res.data.users || []);
        } catch (error) {
            console.error('Error fetching users', error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/school/modules', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowCreateModal(false);
            fetchCourses();
        } catch (error) {
            alert('Error creating course');
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
                {(user.role === 'SUPER_ADMIN' || user.role === 'LIDER_DOCE') && (
                    <button
                        onClick={() => setShowCreateModal(true)}
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
                        className="bg-white dark:bg-gray-800 rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow p-6 border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{course.name}</h3>
                            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                                {course._count?.enrollments || 0} Estudiantes
                            </span>
                        </div>
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

                {courses.length === 0 && (
                    <p className="text-gray-500 col-span-full text-center py-10">No hay clases activas.</p>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 transition-all">
                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-filter backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-lg w-full p-8 transform transition-all scale-100">
                        <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Nueva Clase</h3>
                        <form onSubmit={handleCreate} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Ej. Vida Discipular 1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                                <textarea
                                    className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows="3"
                                    placeholder="Breve descripción de la clase..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Fecha Fin</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white"
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Profesor</label>
                                <select
                                    className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white"
                                    value={formData.professorId}
                                    onChange={e => setFormData({ ...formData, professorId: e.target.value })}
                                >
                                    <option value="">Seleccionar Profesor...</option>
                                    {leaders.map(l => (
                                        <option key={l.id} value={l.id}>{l.fullName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Auxiliares <span className="text-xs font-normal text-gray-500">(Ctrl+Click para múltiple)</span></label>
                                <select
                                    multiple
                                    className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all dark:text-white h-24"
                                    value={formData.auxiliarIds}
                                    onChange={e => {
                                        const options = Array.from(e.target.selectedOptions, option => option.value);
                                        setFormData({ ...formData, auxiliarIds: options });
                                    }}
                                >
                                    {leaders.map(l => (
                                        <option key={l.id} value={l.id}>{l.fullName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-6 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                                >
                                    Crear Clase
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseManagement;
