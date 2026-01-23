import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ChurchAttendance from '../components/ChurchAttendance';
import ChurchAttendanceChart from '../components/ChurchAttendanceChart';
import GuestTracking from '../components/GuestTracking';
import GuestTrackingStats from '../components/GuestTrackingStats';


const Consolidar = () => {
    const { user } = useAuth();
    const tabs = [
        { id: 'tracking', label: 'Seguimiento de Invitados', component: GuestTracking },
        { id: 'stats-tracking', label: 'Estadísticas de Invitados', component: GuestTrackingStats, roles: ['SUPER_ADMIN', 'PASTOR', 'LIDER_DOCE'] },
        { id: 'attendance', label: 'Asistencia a la Iglesia', component: ChurchAttendance },
        { id: 'stats', label: 'Estadísticas de Asistencia', component: ChurchAttendanceChart, roles: ['SUPER_ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'] }
    ].filter(tab => !tab.roles || tab.roles.some(role => user?.roles?.includes(role)));

    // Ensure we have a default active tab if 'tracking' is not available (though it should be for most)
    const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'tracking');

    const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Consolidar</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Gestión de seguimiento, asistencia y estadísticas</p>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
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

export default Consolidar;
