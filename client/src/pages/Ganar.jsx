import { useState } from 'react';
import GuestRegistrationForm from '../components/GuestRegistrationForm';
import GuestList from '../components/GuestList';

const Ganar = () => {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showRegistration, setShowRegistration] = useState(false);

    const handleGuestCreated = () => {
        // Trigger refresh of guest list and hide form
        setRefreshTrigger(prev => prev + 1);
        setShowRegistration(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Ganar</h1>
                    <p className="text-gray-400">Registro y seguimiento de invitados</p>
                </div>
                <button
                    onClick={() => setShowRegistration(!showRegistration)}
                    className={`px - 4 py - 2 rounded - lg transition - colors ${showRegistration
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        } `}
                >
                    {showRegistration ? 'Cancelar Registro' : 'Registrar Nuevo Invitado'}
                </button>
            </div>

            {showRegistration && (
                <GuestRegistrationForm onGuestCreated={handleGuestCreated} />
            )}

            <GuestList refreshTrigger={refreshTrigger} />
        </div>
    );
};

export default Ganar;
