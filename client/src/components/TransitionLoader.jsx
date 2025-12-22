import React, { useEffect } from 'react';
import { useLoading } from '../context/LoadingContext';

const TransitionLoader = () => {
    const { startLoading, stopLoading, updateProgress } = useLoading();

    useEffect(() => {
        startLoading();

        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress > 95) {
                progress = 95;
                clearInterval(interval);
            }
            updateProgress(Math.floor(progress));
        }, 200);

        return () => {
            clearInterval(interval);
            stopLoading();
        };
    }, []);

    return null; // The LoadingOverlay handles the UI
};

export default TransitionLoader;
