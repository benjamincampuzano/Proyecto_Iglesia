import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Home, Users, UserPlus, Heart, Send, Calendar, BookOpen, LogOut, Network, Activity, ChevronLeft, ChevronRight, Target } from 'lucide-react';
import UserMenu from '../components/UserMenu';
import UserProfileModal from '../components/UserProfileModal';
import logo from '../assets/logo.jpg';

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
    const { user, logout, hasAnyRole, isAdmin } = useAuth();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [showProfileModal, setShowProfileModal] = useState(false);

    if (!user) return <Outlet />;

    const navItems = [
        { to: '/', icon: Home, label: 'Home' },
        ...(hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE']) ? [{ to: '/metas', icon: Target, label: 'Metas' }] : []),
        { to: '/ganar', icon: UserPlus, label: 'Ganar' },
        { to: '/consolidar', icon: Heart, label: 'Consolidar' },
        { to: '/discipular', icon: BookOpen, label: 'Discipular' },
        { to: '/enviar', icon: Send, label: 'Enviar' },
        { to: '/encuentros', icon: Users, label: 'Encuentros' },
        { to: '/convenciones', icon: Calendar, label: 'Convenciones' },
        ...(isAdmin()
            ? [
                { to: '/usuarios', icon: Users, label: 'Usuarios' },
                { to: '/auditoria', icon: Activity, label: 'Auditoría' }
            ]
            : [])
    ];

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Sidebar */}
            <aside
                className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out relative`}
            >
                <div className={`${isCollapsed ? 'p-4' : 'p-6'} border-b border-gray-200 dark:border-gray-800 flex items-center justify-between overflow-hidden`}>
                    <div className="flex items-center space-x-3 min-w-0">
                        <div className={`relative ${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'} transition-all duration-300`}>
                            {/* Logo container with pulse/glow like loading screen */}
                            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-pulse"></div>
                            <div className="relative w-full h-full rounded-full overflow-hidden bg-white shadow-lg border border-gray-200 dark:border-gray-800">
                                <img
                                    src={logo}
                                    alt="MCI Logo"
                                    className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500"
                                />
                            </div>
                        </div>

                        {!isCollapsed && (
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {user.fullName}
                                </p>
                                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold truncate">
                                    Panel de Control
                                </p>
                            </div>
                        )}
                    </div>
                    {/* The old button was here and is now removed */}
                </div>

                {/* New Floating Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-20 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-full p-1.5 shadow-md hover:shadow-lg transition-all z-50 text-gray-500 hover:text-blue-600 flex items-center justify-center"
                    title={isCollapsed ? "Expandir" : "Colapsar"}
                >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 rounded-lg transition-colors ${location.pathname === item.to
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
                        className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 w-full rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors`}
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
        </div>
    );
};

export default Layout;
