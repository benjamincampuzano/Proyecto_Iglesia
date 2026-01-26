import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, BookOpen } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const SeminarModuleList = () => {
    const { user, hasAnyRole } = useAuth();
    const [modules, setModules] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingModule, setEditingModule] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        moduleType: '1',
        moduleLevel: 'A'
    });

    // Helper to format full module code
    const formatModuleCode = (type, level) => `${type}${level}`;

    useEffect(() => {
        fetchModules();
    }, []);

    const fetchModules = async () => {
        try {
            const response = await api.get('/seminar');
            setModules(response.data);
        } catch (error) {
            console.error('Error fetching modules:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Construct standard name if empty or manually typed? 
        // User asked for selection "1A, 1B...". 
        // We will save this as the module "name" or "number" depending on schema.
        // Existing schema uses `moduleNumber` (int) and `name` (string).
        // Let's use `name` for "1A", "1B" etc. and maybe `moduleNumber` just for ordering if needed.
        // Actually, let's map 1A->1, 1B->2, 2A->3 etc for sort order? Or just trust the string.

        const finalName = editingModule ? formData.name : `Módulo ${formData.moduleType}${formData.moduleLevel}`;

        const payload = {
            name: finalName,
            description: formData.description,
            // We might want to save the code too if needed
            code: `${formData.moduleType}${formData.moduleLevel}`
        };

        try {
            const response = editingModule
                ? await api.put(`/seminar/${editingModule.id}`, payload)
                : await api.post('/seminar', payload);

            if (response.status === 200 || response.status === 201) {
                alert(editingModule ? 'Módulo actualizado exitosamente' : 'Módulo creado exitosamente');
                await fetchModules();
                setShowForm(false);
                setEditingModule(null);
                setFormData({ name: '', description: '', moduleType: '1', moduleLevel: 'A' });
            }
        } catch (error) {
            console.error('Error saving module:', error);
            alert(`Error: ${error.response?.data?.error || error.message}`);
        }
    };

    const handleEdit = (module) => {
        setEditingModule(module);
        setFormData({
            name: module.name,
            description: module.description || '',
            moduleType: '1', // Defaults as we can't easily parse back without specific logic
            moduleLevel: 'A'
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este módulo?')) return;

        try {
            await api.delete(`/seminar/${id}`);
            alert('Módulo eliminado exitosamente');
            fetchModules();
        } catch (error) {
            console.error('Error deleting module:', error);
            alert(`Error: ${error.response?.data?.error || 'No se pudo eliminar el módulo'}`);
        }
    };

    const canDelete = hasAnyRole(['ADMIN', 'LIDER_DOCE']);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">Módulos del Seminario</h3>
                <button
                    onClick={() => {
                        setShowForm(!showForm);
                        setEditingModule(null);
                        setFormData({ name: '', description: '', moduleType: '1', moduleLevel: 'A' });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Módulo
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h4 className="text-lg font-semibold mb-4">
                        {editingModule ? 'Editar Módulo' : 'Nuevo Módulo'}
                    </h4>
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {!editingModule && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nivel</label>
                                    <select
                                        value={formData.moduleType}
                                        onChange={(e) => setFormData({ ...formData, moduleType: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg"
                                    >
                                        <option value="1">Nivel 1</option>
                                        <option value="2">Nivel 2</option>
                                        <option value="3">Nivel 3</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sección</label>
                                    <select
                                        value={formData.moduleLevel}
                                        onChange={(e) => setFormData({ ...formData, moduleLevel: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg"
                                    >
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {editingModule && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre del Módulo
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descripción
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                rows="3"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                {editingModule ? 'Actualizar' : 'Crear'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingModule(null);
                                }}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((module) => (
                    <div key={module.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-purple-600" />
                                <span className="text-sm font-semibold text-purple-600">
                                    {module.code || `Módulo ${module.moduleNumber || ''}`}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(module)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                {canDelete && (
                                    <button
                                        onClick={() => handleDelete(module.id)}
                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <h4 className="font-semibold text-gray-800 mb-2">{module.name}</h4>
                        {module.description && (
                            <p className="text-sm text-gray-600 mb-3">{module.description}</p>
                        )}
                        <div className="text-sm text-gray-500">
                            {module._count?.enrollments || 0} estudiantes inscritos
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SeminarModuleList;
