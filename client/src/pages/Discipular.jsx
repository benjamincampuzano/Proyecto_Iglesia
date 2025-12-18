import { useState } from 'react';
import CourseManagement from '../components/School/CourseManagement';
import SchoolLeaderStats from '../components/School/SchoolLeaderStats';
import { BookOpen, BarChart2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Discipular = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('management');

    const tabs = [
        { id: 'management', label: 'Clases y Notas', icon: BookOpen },
        { id: 'stats', label: 'Reporte Estadístico', icon: BarChart2 }
    ].filter(tab => {
        if (user?.role === 'MIEMBRO' && tab.id === 'stats') return false;
        return true;
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Capacitación Destino</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Escuela de Liderazgo</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                ${activeTab === tab.id
                                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                            `}
                        >
                            <tab.icon size={18} className={`mr-2 ${activeTab === tab.id ? 'text-purple-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="mt-6">
                {activeTab === 'management' ? <CourseManagement /> : <SchoolLeaderStats />}
            </div>
        </div>
    );
};

export default Discipular;
