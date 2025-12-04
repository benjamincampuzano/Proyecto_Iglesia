import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import LosDoceGrid from '../components/LosDoceGrid';
import NetworkTree from '../components/NetworkTree';

const Home = () => {
    const { user } = useAuth();
    const [losDoce, setLosDoce] = useState([]);
    const [selectedLeader, setSelectedLeader] = useState(null);
    const [network, setNetwork] = useState(null);
    const [loading, setLoading] = useState(true);
    const [networkLoading, setNetworkLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchLosDoce();
    }, []);

    const fetchLosDoce = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/network/los-doce', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar Los Doce');
            }

            const data = await response.json();
            setLosDoce(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectLeader = async (leader) => {
        try {
            setNetworkLoading(true);
            setSelectedLeader(leader);
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/network/network/${leader.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar la red de discipulado');
            }

            const data = await response.json();
            setNetwork(data);
        } catch (err) {
            setError(err.message);
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

            <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                    Los Doce
                </h2>
                <LosDoceGrid losDoce={losDoce} onSelectLeader={handleSelectLeader} />
            </div>

            {networkLoading ? (
                <div className="flex items-center justify-center h-32">
                    <div className="text-gray-500">Cargando red de discipulado...</div>
                </div>
            ) : (
                network && (
                    <div>
                        <NetworkTree network={network} />
                    </div>
                )
            )}
        </div>
    );
};

export default Home;
