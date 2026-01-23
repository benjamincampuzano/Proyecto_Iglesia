import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CellAttendance from '../components/CellAttendance';
import AttendanceChart from '../components/AttendanceChart';
import CellManagement from '../components/CellManagement';

const Enviar = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('attendance');

    const tabs = [
        { id: 'attendance', label: 'Asistencia a la Célula', component: CellAttendance },
        { id: 'stats', label: 'Estadísticas', component: AttendanceChart, roles: ['SUPER_ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'] },
        { id: 'gestion', label: 'Gestión de Células', component: CellManagement, roles: ['SUPER_ADMIN', 'PASTOR', 'LIDER_DOCE'] }
    ].filter(tab => !tab.roles || tab.roles.some(role => user?.roles?.includes(role)));

    const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Enviar</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Gestión de asistencia a células y estadísticas</p>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
              `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {ActiveComponent && <ActiveComponent />}
            </div>
        </div>
    );
};

export default Enviar;
