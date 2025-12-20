import { useState, useEffect } from 'react';

const ConnectivityHandler = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white text-center p-2 z-[9999] font-bold shadow-lg transition-transform duration-300 transform translate-y-0">
            ⚠️ Sin conexión a internet. La aplicación está en modo offline.
        </div>
    );
};

export default ConnectivityHandler;
