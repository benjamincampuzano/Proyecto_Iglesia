import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const activeTasks = useRef(0);

    const startLoading = () => {
        activeTasks.current += 1;
        if (!isLoading) {
            setIsLoading(true);
            setProgress(0);
        }
    };

    // Fail-safe: if loading takes more than 15 seconds, force clear it
    useEffect(() => {
        let failsafe;
        if (isLoading) {
            failsafe = setTimeout(() => {
                console.warn('Loading fail-safe triggered. Clearing stuck loading screen.');
                activeTasks.current = 0;
                setIsLoading(false);
                setProgress(0);
            }, 15000);
        }
        return () => clearTimeout(failsafe);
    }, [isLoading]);

    const stopLoading = () => {
        if (activeTasks.current > 0) {
            activeTasks.current -= 1;
        }

        if (activeTasks.current === 0) {
            setProgress(100);
            setTimeout(() => {
                // Check again if some other task started in the meantime
                if (activeTasks.current === 0) {
                    setIsLoading(false);
                    setProgress(0);
                }
            }, 500);
        }
    };

    const updateProgress = (val) => {
        // Only update progress if we are actually loading and the new value is higher
        setProgress(prev => Math.max(prev, val));
    };

    return (
        <LoadingContext.Provider value={{ isLoading, progress, startLoading, stopLoading, updateProgress }}>
            {children}
        </LoadingContext.Provider>
    );
};

export const useLoading = () => {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};
