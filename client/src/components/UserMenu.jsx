import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Settings, Users, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const UserMenu = ({ onOpenProfile }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { user, logout, isAdmin: contextIsAdmin } = useAuth();
    const menuRef = useRef(null);

    const isAdmin = contextIsAdmin();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleMenuItemClick = (action) => {
        setIsOpen(false);
        action();
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
            >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <User size={18} className="text-white" />
                </div>
                <div className="text-left hidden md:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.fullName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {Array.isArray(user?.roles) ? user.roles.join(', ').replace(/_/g, ' ') : (typeof user?.role === 'string' ? user.role.replace(/_/g, ' ') : (Array.isArray(user?.role) ? user.role.join(', ').replace(/_/g, ' ') : 'Usuario'))}
                    </p>
                </div>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.fullName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>

                    <button
                        onClick={() => handleMenuItemClick(onOpenProfile)}
                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                        <Settings size={18} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-200">Mi Perfil</span>
                    </button>

                    {isAdmin && (
                        <>
                            <Link
                                to="/usuarios"
                                onClick={() => setIsOpen(false)}
                                className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                            >
                                <Users size={18} className="text-gray-500 dark:text-gray-400" />
                                <span className="text-sm text-gray-700 dark:text-gray-200">Gestionar Usuarios</span>
                            </Link>
                        </>
                    )}

                    <div className="px-4 py-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 dark:text-gray-200">Tema</span>
                            <ThemeToggle />
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                        <button
                            onClick={() => handleMenuItemClick(logout)}
                            className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                        >
                            <LogOut size={18} className="text-red-500 dark:text-red-400" />
                            <span className="text-sm text-red-600 dark:text-red-400">Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserMenu;
