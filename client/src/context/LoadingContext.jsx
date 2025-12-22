import React, { createContext, useContext, useState, useEffect } from 'react';

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    // Function to simulate progress if needed, or can be set manually
    const startLoading = () => {
        setIsLoading(true);
        setProgress(0);
    };

    const stopLoading = () => {
        setProgress(100);
        setTimeout(() => {
            setIsLoading(false);
            setProgress(0);
        }, 500); // Small delay to show 100%
    };

    const updateProgress = (val) => {
        setProgress(val);
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
