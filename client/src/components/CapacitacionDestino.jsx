import { useState } from 'react';
import SeminarModuleList from './SeminarModuleList';
import EnrollmentPanel from './EnrollmentPanel';
import ClassAttendanceTracker from './ClassAttendanceTracker';
import StudentProgress from './StudentProgress';

const CapacitacionDestino = () => {
    const [activeSubTab, setActiveSubTab] = useState('modules');

    const subTabs = [
        { id: 'modules', label: 'Módulos', component: SeminarModuleList },
        { id: 'enrollment', label: 'Inscripción', component: EnrollmentPanel },
        { id: 'attendance', label: 'Asistencia a Clases', component: ClassAttendanceTracker },
        { id: 'progress', label: 'Progreso de Estudiantes', component: StudentProgress }
    ];

    const ActiveSubComponent = subTabs.find(tab => tab.id === activeSubTab)?.component;

    return (
        <div className="space-y-6">
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                <h2 className="text-lg font-semibold text-purple-900">Capacitación Destino</h2>
                <p className="text-sm text-purple-700 mt-1">
                    Sistema de gestión de seminario bíblico
                </p>
            </div>

            {/* Sub-tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6">
                    {subTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`
                py-3 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeSubTab === tab.id
                                    ? 'border-purple-500 text-purple-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
              `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Sub-tab Content */}
            <div className="mt-6">
                {ActiveSubComponent && <ActiveSubComponent />}
            </div>
        </div>
    );
};

export default CapacitacionDestino;
