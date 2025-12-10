import React, { useState } from 'react';
import ModuleDetails from './ModuleDetails';

const AttendancePanel = ({ modules }) => {
    const [selectedModuleId, setSelectedModuleId] = useState('');

    const selectedModule = modules.find(m => m.id === parseInt(selectedModuleId));

    return (
        <div>
            <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Seleccionar Módulo para ver Asistencia
                </label>
                <select
                    value={selectedModuleId}
                    onChange={(e) => setSelectedModuleId(e.target.value)}
                    className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="">-- Seleccionar Módulo --</option>
                    {modules.map(m => (
                        <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                    ))}
                </select>
            </div>

            {selectedModule ? (
                <ModuleDetails module={selectedModule} />
            ) : (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No has seleccionado un módulo</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Selecciona uno arriba para ver la planilla de asistencia y calificaciones.</p>
                </div>
            )}
        </div>
    );
};

export default AttendancePanel;
