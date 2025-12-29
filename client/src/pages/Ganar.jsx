import { useState } from 'react';
import { Users, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GuestRegistrationForm from '../components/GuestRegistrationForm';
import GuestList from '../components/GuestList';
import GuestStats from '../components/GuestStats';

const Ganar = () => {
    const { user } = useAuth();
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showRegistration, setShowRegistration] = useState(false);
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'stats'

    const handleGuestCreated = () => {
        // Trigger refresh of guest list and hide form
        setRefreshTrigger(prev => prev + 1);
        setShowRegistration(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Ganar</h1>
                    <p className="text-gray-500 dark:text-gray-400">Registro y seguimiento de invitados</p>
                </div>
                {activeTab === 'list' && (
                    <button
                        onClick={() => setShowRegistration(!showRegistration)}
                        className={`px-4 py-2 rounded-lg transition-colors ${showRegistration
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                    >
                        {showRegistration ? 'Cancelar Registro' : 'Registrar Nuevo Invitado'}
                    </button>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => {
                        setActiveTab('list');
                        setShowRegistration(false);
                    }}
                    className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors ${activeTab === 'list'
                        ? 'text-blue-500 border-b-2 border-blue-500'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <Users size={20} />
                    <span>Lista de Invitados</span>
                </button>
                {(user.role !== 'DISCIPULO') && (
                    <button
                        onClick={() => {
                            setActiveTab('stats');
                            setShowRegistration(false);
                        }}
                        className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors ${activeTab === 'stats'
                            ? 'text-blue-500 border-b-2 border-blue-500'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <BarChart3 size={20} />
                        <span>Estadísticas</span>
                    </button>
                )}
            </div>

            {/* Tab Content */}
            {activeTab === 'list' && (
                <>
                    {showRegistration && (
                        <GuestRegistrationForm onGuestCreated={handleGuestCreated} />
                    )}
                    <GuestList refreshTrigger={refreshTrigger} />
                </>
            )}

            {activeTab === 'stats' && <GuestStats />}
        </div>
    );
};

export default Ganar;
