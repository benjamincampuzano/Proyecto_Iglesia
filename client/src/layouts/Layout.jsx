import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Home, Users, UserPlus, Heart, Send, Calendar, BookOpen, LogOut, Network } from 'lucide-react';
import UserMenu from '../components/UserMenu';
import UserProfileModal from '../components/UserProfileModal';
import UserManagementModal from '../components/UserManagementModal';

const SidebarItem = ({ to, icon: Icon, label, active }) => (
    <Link
        to={to}
        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${active
            ? 'bg-blue-600 text-white'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
    >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
    </Link>
);

const Layout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showUserManagementModal, setShowUserManagementModal] = useState(false);

    if (!user) return <Outlet />;

    const navItems = [
        { to: '/', icon: Home, label: 'Home' },
        { to: '/ganar', icon: UserPlus, label: 'Ganar' },
        { to: '/consolidar', icon: Heart, label: 'Consolidar' },
        { to: '/discipular', icon: BookOpen, label: 'Discipular' },
        { to: '/enviar', icon: Send, label: 'Enviar' },
        { to: '/encuentros', icon: Users, label: 'Encuentros' },
        { to: '/convenciones', icon: Calendar, label: 'Convenciones' },
    ];

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Sidebar */}
            <aside
                className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out`}
            >
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    {!isCollapsed && (
                        <div>
                            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-500 truncate">MCI</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{user.fullName}</p>
                        </div>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                    >
                        {isCollapsed ? <div className="font-bold text-xl">→</div> : <div className="font-bold text-xl">←</div>}
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-lg transition-colors ${location.pathname === item.to
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            title={isCollapsed ? item.label : ''}
                        >
                            <item.icon size={20} />
                            {!isCollapsed && <span className="font-medium">{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                    <button
                        onClick={logout}
                        className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 w-full rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors`}
                        title={isCollapsed ? "Cerrar Sesión" : ""}
                    >
                        <LogOut size={20} />
                        {!isCollapsed && <span className="font-medium">Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 flex flex-col">
                {/* Header Bar */}
                <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-8 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
                    <UserMenu
                        onOpenProfile={() => setShowProfileModal(true)}
                        onOpenUserManagement={() => setShowUserManagementModal(true)}
                    />
                </header>

                {/* Page Content */}
                <div className="flex-1 p-8">
                    <Outlet />
                </div>
            </main>

            {/* Modals */}
            <UserProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
            />
            <UserManagementModal
                isOpen={showUserManagementModal}
                onClose={() => setShowUserManagementModal(false)}
            />
        </div>
    );
};

export default Layout;
