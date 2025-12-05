import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, BookOpen } from 'lucide-react';

const SeminarModuleList = () => {
    const [modules, setModules] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingModule, setEditingModule] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        moduleNumber: ''
    });

    useEffect(() => {
        fetchModules();
    }, []);

    const fetchModules = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/seminar', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setModules(data);
        } catch (error) {
            console.error('Error fetching modules:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const url = editingModule
                ? `http://localhost:5000/api/seminar/${editingModule.id}`
                : 'http://localhost:5000/api/seminar';

            const response = await fetch(url, {
                method: editingModule ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            let data;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json();
            } else {
                // If not JSON, probably an HTML error page or empty
                const text = await response.text();
                throw new Error(text || `Error ${response.status}: ${response.statusText}`);
            }

            if (response.ok) {
                alert(editingModule ? 'Módulo actualizado exitosamente' : 'Módulo creado exitosamente');
                await fetchModules(); // Wait for modules to refresh
                setShowForm(false);
                setEditingModule(null);
                setFormData({ name: '', description: '', moduleNumber: '' });
            } else {
                throw new Error(data.error || data.message || 'No se pudo guardar el módulo');
            }
        } catch (error) {
            console.error('Error saving module:', error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleEdit = (module) => {
        setEditingModule(module);
        setFormData({
            name: module.name,
            description: module.description || '',
            moduleNumber: module.moduleNumber
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este módulo?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/seminar/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                alert('Módulo eliminado exitosamente');
                fetchModules();
            } else {
                const data = await response.json();
                alert(`Error: ${data.error || 'No se pudo eliminar el módulo'}`);
            }
        } catch (error) {
            console.error('Error deleting module:', error);
            alert('Error de conexión al eliminar el módulo');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">Módulos del Seminario</h3>
                <button
                    onClick={() => {
                        setShowForm(!showForm);
                        setEditingModule(null);
                        setFormData({ name: '', description: '', moduleNumber: '' });
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Número de Módulo
                            </label>
                            <input
                                type="number"
                                value={formData.moduleNumber}
                                onChange={(e) => setFormData({ ...formData, moduleNumber: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                required
                                min="1"
                                max="6"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre del Módulo
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>
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
                                    Módulo {module.moduleNumber}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(module)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(module.id)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
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
