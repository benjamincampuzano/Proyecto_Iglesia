import TabNavigator from '../components/TabNavigator';
import CourseManagement from '../components/School/CourseManagement';
import SchoolLeaderStats from '../components/School/SchoolLeaderStats';
import { ROLES, ROLE_GROUPS } from '../constants/roles';

const Discipular = () => {
    const tabs = [
        { id: 'management', label: 'Clases y Notas', component: CourseManagement },
        {
            id: 'stats',
            label: 'Reporte Estadístico',
            component: SchoolLeaderStats,
            roles: ROLE_GROUPS.ALL_LEADERS
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Capacitación Destino</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Escuela de Liderazgo</p>
            </div>

            <TabNavigator tabs={tabs} initialTabId="management" />
        </div>
    );
};

export default Discipular;
