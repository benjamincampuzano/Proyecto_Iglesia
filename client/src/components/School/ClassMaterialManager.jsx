import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, FileText, Video, HelpCircle, Save, Plus, Trash } from 'lucide-react';

const ClassMaterialManager = ({ moduleId, classNumber, onClose }) => {
    const [material, setMaterial] = useState({
        description: '',
        documents: [],
        videoLinks: [],
        quizLinks: []
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchMaterials();
    }, [moduleId, classNumber]);

    const fetchMaterials = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5000/api/school/modules/${moduleId}/materials`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const classMat = res.data.find(m => m.classNumber === classNumber);
            if (classMat) {
                setMaterial({
                    description: classMat.description || '',
                    documents: classMat.documents || [],
                    videoLinks: classMat.videoLinks || [],
                    quizLinks: classMat.quizLinks || []
                });
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching materials', error);
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            await axios.post(`http://localhost:5000/api/school/modules/${moduleId}/materials/${classNumber}`, material, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSaving(false);
            onClose();
        } catch (error) {
            alert('Error saving materials');
            setSaving(false);
        }
    };

    const addItem = (field) => {
        setMaterial({ ...material, [field]: [...material[field], ""] });
    };

    const updateItem = (field, index, value) => {
        const newList = [...material[field]];
        newList[index] = value;
        setMaterial({ ...material, [field]: newList });
    };

    const removeItem = (field, index) => {
        setMaterial({ ...material, [field]: material[field].filter((_, i) => i !== index) });
    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Material de Clase {classNumber}</h3>
                        <p className="text-xs text-gray-500 uppercase font-semibold mt-1">Gestión de Contenidos Didácticos</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <FileText size={16} className="text-blue-500" />
                            Descripción / Guía de la Clase
                        </label>
                        <textarea
                            className="w-full p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                            rows="3"
                            value={material.description}
                            onChange={e => setMaterial({ ...material, description: e.target.value })}
                            placeholder="Escribe un resumen o instrucciones para esta clase..."
                        />
                    </div>

                    {/* Links Section */}
                    {[
                        { label: 'Documentos (URLs)', field: 'documents', icon: <FileText size={16} />, color: 'text-orange-500', placeholder: 'https://docs.google.com/...' },
                        { label: 'Videos (YouTube/Vimeo)', field: 'videoLinks', icon: <Video size={16} />, color: 'text-red-500', placeholder: 'https://youtube.com/watch?v=...' },
                        { label: 'Cuestionarios (Forms/Quiz)', field: 'quizLinks', icon: <HelpCircle size={16} />, color: 'text-purple-500', placeholder: 'https://forms.gle/...' }
                    ].map((section) => (
                        <div key={section.field} className="space-y-3 bg-gray-50 dark:bg-gray-900/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                                <label className={`text-sm font-bold flex items-center gap-2 ${section.color}`}>
                                    {section.icon}
                                    {section.label}
                                </label>
                                <button
                                    onClick={() => addItem(section.field)}
                                    className="text-xs flex items-center gap-1 bg-white dark:bg-gray-700 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-sm transition-all text-gray-600 dark:text-gray-300"
                                >
                                    <Plus size={14} /> Añadir
                                </button>
                            </div>
                            <div className="space-y-2">
                                {material[section.field].map((link, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 text-sm p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                                            value={link}
                                            onChange={e => updateItem(section.field, idx, e.target.value)}
                                            placeholder={section.placeholder}
                                        />
                                        <button onClick={() => removeItem(section.field, idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                ))}
                                {material[section.field].length === 0 && (
                                    <p className="text-xs text-gray-400 italic">No hay enlaces agregados aún.</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-bold transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                            <Save size={18} />
                        )}
                        {saving ? 'Guardando...' : 'Guardar Información'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClassMaterialManager;
