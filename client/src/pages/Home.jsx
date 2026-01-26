import { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '../context/AuthContext';
import LosDoceGrid from '../components/LosDoceGrid';
import api from '../utils/api';
import NetworkTree from '../components/NetworkTree';

// Lazy load heavy chart component
const ConsolidatedStatsReport = lazy(() => import('../components/ConsolidatedStatsReport'));

const Home = () => {
    const { user, hasRole, hasAnyRole, isSuperAdmin } = useAuth();
    const [pastores, setPastores] = useState([]);
    const [selectedLeader, setSelectedLeader] = useState(null);
    const [network, setNetwork] = useState(null);
    const [loading, setLoading] = useState(true);
    const [networkLoading, setNetworkLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isSuperAdmin()) {
            fetchPastores();
        } else if (hasAnyRole(['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'])) {
            // Automatically load their network context
            // If disciple, show their hierarchy: Cell Leader -> Doce Leader -> Pastor
            let leaderId = user.id;
            if (hasRole('DISCIPULO')) {
                leaderId = user.liderCelulaId || user.liderDoceId || user.pastorId || user.id;
            }
            handleSelectLeader({ id: leaderId, fullName: user.fullName, roles: user.roles });
            setLoading(false);
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchPastores = async () => {
        try {
            setLoading(true);
            const response = await api.get('/network/pastores');
            setPastores(response.data);
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectLeader = async (leader) => {
        try {
            setNetworkLoading(true);
            setSelectedLeader(leader);
            const response = await api.get(`/network/network/${leader.id}`);
            setNetwork(response.data);
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setNetworkLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500 dark:text-gray-400">Cargando...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
            </div>
        );
    }

    const canViewNetwork = hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO']);
    const canViewReport = hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE']);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Dashboard Principal
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Bienvenido, {user?.fullName}
                </p>
            </div>

            <div className="space-y-12">
                {/* Network & Structure */}
                <div className="space-y-8">
                    {canViewNetwork ? (
                        <>
                            {isSuperAdmin() && (
                                <div className="min-h-[200px]">
                                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                        Pastores
                                    </h2>
                                    <LosDoceGrid losDoce={pastores} onSelectLeader={handleSelectLeader} />
                                </div>
                            )}

                            {networkLoading ? (
                                <div className="flex items-center justify-center h-[500px] bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="text-gray-500 dark:text-gray-400">Cargando red de discipulado...</div>
                                </div>
                            ) : (
                                <div className="min-h-[500px]">
                                    {network && (
                                        <div>
                                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                                {isSuperAdmin()
                                                    ? `Red de ${selectedLeader?.fullName}`
                                                    : 'Mi Red'
                                                }
                                            </h2>
                                            <NetworkTree
                                                network={network}
                                                currentUser={user}
                                                onNetworkChange={() => handleSelectLeader(selectedLeader || user)}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Panel de Discípulo</h3>
                            <p className="text-gray-600 dark:text-gray-400">Bienvenido al sistema de gestión.</p>
                        </div>
                    )}
                </div>

                {/* Bottom Section: Consolidated Report & Stats */}
                {canViewReport && (
                    <div className="min-h-[600px]">
                        <Suspense fallback={<div className="h-[600px] flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400">Cargando Estadísticas...</div>}>
                            <ConsolidatedStatsReport simpleMode={false} />
                        </Suspense>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
