import { useState } from 'react';
import CourseManagement from '../components/School/CourseManagement';
import SchoolLeaderStats from '../components/School/SchoolLeaderStats';
import { BookOpen, BarChart2 } from 'lucide-react';

const Discipular = () => {
    const [activeTab, setActiveTab] = useState('management');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Discipular</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Escuela de Liderazgo y Formación</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('management')}
                        className={`
                            group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'management'
                                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                        `}
                    >
                        <BookOpen size={18} className={`mr-2 ${activeTab === 'management' ? 'text-purple-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        Gestión de Clases
                    </button>
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`
                            group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'report'
                                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                        `}
                    >
                        <BarChart2 size={18} className={`mr-2 ${activeTab === 'report' ? 'text-purple-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        Reporte Estadístico
                    </button>
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
