import React, { useEffect, useState } from 'react';
import { useLoading } from '../context/LoadingContext';
import logo from '../assets/logo.jpg';

const LoadingOverlay = () => {
    const { isLoading, progress } = useLoading();
    const [displayProgress, setDisplayProgress] = useState(0);

    // Smoothly animate the progress number
    useEffect(() => {
        if (isLoading) {
            const timer = setInterval(() => {
                setDisplayProgress(prev => {
                    if (prev < progress) return prev + 1;
                    if (prev > progress) return progress;
                    return prev;
                });
            }, 10);
            return () => clearInterval(timer);
        } else {
            setDisplayProgress(0);
        }
    }, [isLoading, progress]);

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md transition-opacity duration-500">
            <div className="relative w-48 h-48 mb-8">
                {/* Outer Glow Animation */}
                <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>

                {/* Rotating Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-slate-700"
                    />
                    <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={553}
                        strokeDashoffset={553 - (553 * displayProgress) / 100}
                        strokeLinecap="round"
                        className="text-blue-500 transition-all duration-300 ease-out"
                    />
                </svg>

                {/* Central Logo */}
                <div className="absolute inset-4 rounded-full overflow-hidden bg-white shadow-xl animate-pulse">
                    <img
                        src={logo}
                        alt="Logo"
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>

            {/* Percentage Text */}
            <div className="text-center">
                <h2 className="text-4xl font-bold text-white mb-2 tabular-nums">
                    {displayProgress}%
                </h2>
                <p className="text-blue-200 text-lg font-medium animate-pulse">
                    Cargando la página web...
                </p>
                <p className="text-slate-400 text-sm mt-1">
                    Actualizando la informacion, ten paciencia.
                </p>
            </div>

            {/* Subtle bottom progress bar */}
            <div className="fixed bottom-0 left-0 w-full h-1 bg-slate-800">
                <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500 ease-out"
                    style={{ width: `${displayProgress}%` }}
                ></div>
            </div>
        </div>
    );
};

export default LoadingOverlay;
