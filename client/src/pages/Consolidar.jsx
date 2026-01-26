import TabNavigator from '../components/TabNavigator';
import ChurchAttendance from '../components/ChurchAttendance';
import ChurchAttendanceChart from '../components/ChurchAttendanceChart';
import GuestTracking from '../components/GuestTracking';
import GuestTrackingStats from '../components/GuestTrackingStats';
import { ROLES, ROLE_GROUPS } from '../constants/roles';

const Consolidar = () => {
    const tabs = [
        { id: 'tracking', label: 'Seguimiento de Invitados', component: GuestTracking },
        { id: 'stats-tracking', label: 'Estadísticas de Invitados', component: GuestTrackingStats, roles: ROLE_GROUPS.CAN_VIEW_STATS },
        { id: 'attendance', label: 'Asistencia a la Iglesia', component: ChurchAttendance },
        { id: 'stats', label: 'Estadísticas de Asistencia', component: ChurchAttendanceChart, roles: ROLE_GROUPS.ALL_LEADERS }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Consolidar</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Gestión de seguimiento, asistencia y estadísticas</p>
            </div>

            <TabNavigator tabs={tabs} initialTabId="tracking" />
        </div>
    );
};

export default Consolidar;
