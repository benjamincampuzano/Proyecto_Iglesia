import { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '../context/AuthContext';
import LosDoceGrid from '../components/LosDoceGrid';
import api from '../utils/api';
import NetworkTree from '../components/NetworkTree';

// Lazy load heavy chart component
const ConsolidatedStatsReport = lazy(() => import('../components/ConsolidatedStatsReport'));

const Home = () => {
    const { user } = useAuth();
    const [pastores, setPastores] = useState([]);
    const [selectedLeader, setSelectedLeader] = useState(null);
    const [network, setNetwork] = useState(null);
    const [loading, setLoading] = useState(true);
    const [networkLoading, setNetworkLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user?.role === 'SUPER_ADMIN') {
            fetchPastores();
        } else if (['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'Miembro'].includes(user?.role)) {
            // Automatically load their network context
            // If member, try to show their Doce leader's network, or just their own
            const leaderId = (user.role === 'Miembro')
                ? (user.liderDoceId || user.pastorId || user.id)
                : user.id;
            handleSelectLeader({ id: leaderId, fullName: user.fullName, role: user.role });
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
                <div className="text-gray-500">Cargando...</div>
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

    const canViewNetwork = ['SUPER_ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'Miembro'].includes(user?.role);
    const canViewReport = ['SUPER_ADMIN', 'PASTOR', 'LIDER_DOCE'].includes(user?.role);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Dashboard Principal
                </h1>
                <p className="text-gray-600">
                    Bienvenido, {user?.fullName}
                </p>
            </div>

            <div className="space-y-12">
                {/* Network & Structure */}
                <div className="space-y-8">
                    {canViewNetwork ? (
                        <>
                            {user?.role === 'SUPER_ADMIN' && (
                                <div className="min-h-[200px]">
                                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                                        Pastores
                                    </h2>
                                    <LosDoceGrid losDoce={pastores} onSelectLeader={handleSelectLeader} />
                                </div>
                            )}

                            {networkLoading ? (
                                <div className="flex items-center justify-center h-[500px] bg-gray-50 rounded-lg">
                                    <div className="text-gray-500">Cargando red de discipulado...</div>
                                </div>
                            ) : (
                                <div className="min-h-[500px]">
                                    {network && (
                                        <div>
                                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                                                {user?.role === 'SUPER_ADMIN'
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
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-medium text-gray-800 mb-2">Panel de Miembro</h3>
                            <p className="text-gray-600">Bienvenido al sistema de gestión.</p>
                        </div>
                    )}
                </div>

                {/* Bottom Section: Consolidated Report & Stats */}
                {canViewReport && (
                    <div className="min-h-[600px]">
                        <Suspense fallback={<div className="h-[600px] flex items-center justify-center bg-gray-50 rounded-lg">Cargando Estadísticas...</div>}>
                            <ConsolidatedStatsReport simpleMode={false} />
                        </Suspense>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
