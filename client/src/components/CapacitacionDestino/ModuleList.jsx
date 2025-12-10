import React, { useState } from 'react';
import ModuleDetails from './ModuleDetails';

const ModuleList = ({ modules, refreshModules }) => {
    const [selectedModule, setSelectedModule] = useState(null);

    const levels = {
        1: modules.filter(m => m.moduleNumber <= 2),
        2: modules.filter(m => m.moduleNumber > 2 && m.moduleNumber <= 4),
        3: modules.filter(m => m.moduleNumber > 4)
    };

    if (selectedModule) {
        return (
            <div>
                <button
                    onClick={() => setSelectedModule(null)}
                    className="mb-4 text-indigo-600 hover:text-indigo-800 flex items-center"
                >
                    ← Volver a la lista
                </button>
                <ModuleDetails module={selectedModule} />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {[1, 2, 3].map(level => (
                <div key={level}>
                    <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Nivel {level}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {levels[level].map(module => (
                            <div
                                key={module.id}
                                onClick={() => setSelectedModule(module)}
                                className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-600"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-indigo-900 dark:text-indigo-300">
                                        {module.code}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {module._count?.enrollments || 0} alumnos
                                    </span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{module.name}</h4>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                    {module.description || 'Sin descripción'}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ModuleList;
