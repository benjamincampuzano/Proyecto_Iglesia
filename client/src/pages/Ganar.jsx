import { useState } from 'react';
import { Users } from 'lucide-react';
import TabNavigator from '../components/TabNavigator';
import GuestRegistrationForm from '../components/GuestRegistrationForm';
import GuestList from '../components/GuestList';
import GuestStats from '../components/GuestStats';
import { ROLES, ROLE_GROUPS } from '../constants/roles';

const Ganar = () => {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showRegistration, setShowRegistration] = useState(false);

    const handleGuestCreated = () => {
        // Trigger refresh of guest list and hide form
        setRefreshTrigger(prev => prev + 1);
        setShowRegistration(false);
    };

    const GuestListTab = () => (
        <>
            {showRegistration && (
                <GuestRegistrationForm onGuestCreated={handleGuestCreated} />
            )}
            <GuestList refreshTrigger={refreshTrigger} />
        </>
    );

    const tabs = [
        { id: 'list', label: 'Lista de Invitados', component: GuestListTab },
        {
            id: 'stats',
            label: 'Estadísticas',
            component: GuestStats,
            roles: ROLE_GROUPS.ALL_LEADERS
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Ganar</h1>
                    <p className="text-gray-500 dark:text-gray-400">Registro y seguimiento de invitados</p>
                </div>
                <button
                    onClick={() => setShowRegistration(!showRegistration)}
                    className={`px-4 py-2 rounded-lg transition-colors ${showRegistration
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                >
                    {showRegistration ? 'Cancelar Registro' : 'Registrar Nuevo Invitado'}
                </button>
            </div>

            <TabNavigator 
                tabs={tabs} 
                initialTabId="list"
                onTabChange={(tabId) => {
                    if (tabId !== 'list') {
                        setShowRegistration(false);
                    }
                }}
            />
        </div>
    );
};

export default Ganar;
