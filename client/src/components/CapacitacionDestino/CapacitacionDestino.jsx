import React, { useState, useEffect } from 'react';
import ModuleList from './ModuleList';
import EnrollmentPanel from './EnrollmentPanel';
import AttendancePanel from './AttendancePanel';

const CapacitacionDestino = () => {
    const [activeTab, setActiveTab] = useState('modules');
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchModules = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/seminars?type=CAPACITACION_DESTINO', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setModules(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching modules:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchModules();
    }, []);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Capacitación Destino</h2>
                    <p className="text-gray-600 dark:text-gray-400">Formación de líderes y pastores</p>
                </div>
            </div>

            <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
                <button
                    className={`pb-2 px-4 whitespace-nowrap ${activeTab === 'modules' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    onClick={() => setActiveTab('modules')}
                >
                    Módulos
                </button>
                <button
                    className={`pb-2 px-4 whitespace-nowrap ${activeTab === 'enrollment' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    onClick={() => setActiveTab('enrollment')}
                >
                    Inscripción
                </button>
                <button
                    className={`pb-2 px-4 whitespace-nowrap ${activeTab === 'attendance' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    onClick={() => setActiveTab('attendance')}
                >
                    Asistencia y Notas
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10">Cargando...</div>
            ) : (
                <>
                    {activeTab === 'modules' && <ModuleList modules={modules} refreshModules={fetchModules} />}
                    {activeTab === 'enrollment' && <EnrollmentPanel modules={modules} />}
                    {activeTab === 'attendance' && <AttendancePanel modules={modules} />}
                </>
            )}
        </div>
    );
};

export default CapacitacionDestino;
